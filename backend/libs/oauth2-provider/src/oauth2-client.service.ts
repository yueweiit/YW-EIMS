import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@eims/database';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class OAuth2ClientService {
  constructor(private readonly prisma: PrismaService) {}

  private generateClientId(): string {
    return `eims_${randomBytes(16).toString('base64url')}`;
  }

  private generateClientSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  async findPage(current: number = 1, size: number = 10, name?: string) {
    const where = name
      ? { name: { contains: name, mode: 'insensitive' as const } }
      : {};
    const [records, total] = await Promise.all([
      this.prisma.oauth2Client.findMany({
        where,
        select: {
          id: true,
          clientId: true,
          name: true,
          description: true,
          redirectUris: true,
          scopes: true,
          status: true,
          createBy: true,
          createTime: true,
          updateBy: true,
          updateTime: true,
        },
        skip: (current - 1) * size,
        take: size,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.oauth2Client.count({ where }),
    ]);
    return { records, total, current, size };
  }

  async findOne(id: number) {
    const client = await this.prisma.oauth2Client.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        name: true,
        description: true,
        redirectUris: true,
        scopes: true,
        status: true,
        createBy: true,
        createTime: true,
        updateBy: true,
        updateTime: true,
      },
    });
    if (!client) {
      throw new NotFoundException('OAuth2 应用不存在');
    }
    return client;
  }

  async create(dto: CreateClientDto, currentUserName: string) {
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const clientSecretHash = await bcrypt.hash(clientSecret, 12);

    const client = await this.prisma.oauth2Client.create({
      data: {
        clientId,
        clientSecret: clientSecretHash,
        name: dto.name,
        description: dto.description,
        redirectUris: dto.redirectUris,
        scopes: dto.scopes || ['openid', 'profile', 'email'],
        status: dto.status || '1',
        createBy: currentUserName,
      },
      select: {
        id: true,
        clientId: true,
        name: true,
        description: true,
        redirectUris: true,
        scopes: true,
        status: true,
        createBy: true,
        createTime: true,
      },
    });

    // The raw secret is returned only once to the administrator. The database
    // stores only the bcrypt hash and it must never be exposed through the API.
    return { ...client, clientSecret };
  }

  async update(id: number, dto: UpdateClientDto, currentUserName: string) {
    const existing = await this.prisma.oauth2Client.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('OAuth2 应用不存在');
    }

    const client = await this.prisma.oauth2Client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.redirectUris !== undefined && {
          redirectUris: dto.redirectUris,
        }),
        ...(dto.scopes !== undefined && { scopes: dto.scopes }),
        ...(dto.status !== undefined && { status: dto.status }),
        updateBy: currentUserName,
      },
      select: {
        id: true,
        clientId: true,
        name: true,
        description: true,
        redirectUris: true,
        scopes: true,
        status: true,
        createBy: true,
        createTime: true,
        updateBy: true,
        updateTime: true,
      },
    });

    return client;
  }

  async remove(id: number) {
    const existing = await this.prisma.oauth2Client.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('OAuth2 应用不存在');
    }
    await this.prisma.oauth2Client.delete({ where: { id } });
    return true;
  }

  async resetSecret(id: number) {
    const existing = await this.prisma.oauth2Client.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('OAuth2 应用不存在');
    }

    const newSecret = this.generateClientSecret();
    const newSecretHash = await bcrypt.hash(newSecret, 12);
    await this.prisma.oauth2Client.update({
      where: { id },
      data: { clientSecret: newSecretHash },
    });

    return { clientId: existing.clientId, clientSecret: newSecret };
  }
}

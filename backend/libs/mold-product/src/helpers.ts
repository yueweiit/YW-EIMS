import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

export function handlePrismaError(e: unknown, entity: string): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const rawTarget = e.meta?.target;
    const target = Array.isArray(rawTarget)
      ? rawTarget.join(', ')
      : String(rawTarget || '唯一字段');
    throw new ConflictException(`${entity}的${target}已存在`);
  }
  throw e;
}

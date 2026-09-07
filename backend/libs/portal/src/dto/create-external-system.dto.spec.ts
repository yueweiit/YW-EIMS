import { ValidationPipe } from '@nestjs/common';
import { CreateExternalSystemDto } from './create-external-system.dto';

describe('CreateExternalSystemDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  function validateCode(code: unknown) {
    return pipe.transform(
      { code, name: '请款平台', entryUrl: 'https://example.com/' },
      { type: 'body', metatype: CreateExternalSystemDto },
    );
  }

  it.each([
    ['paymentRequest', 'paymentrequest'],
    ['  Payment_Request  ', 'payment_request'],
    ['payment-request', 'payment-request'],
    ['a1', 'a1'],
    ['a'.repeat(50), 'a'.repeat(50)],
  ])('normalizes %s before request validation', async (input, expected) => {
    const dto: CreateExternalSystemDto = await validateCode(input);
    expect(dto.code).toBe(expected);
  });

  it.each([
    '',
    ' ',
    'a',
    'a'.repeat(51),
    '_payment',
    'payment request',
    '请款',
    123,
    null,
    ['erp'],
  ])(
    'rejects an invalid code (%j) with an actionable message',
    async (code) => {
      await expect(validateCode(code)).rejects.toMatchObject({
        status: 400,
        response: {
          message: expect.arrayContaining([
            '系统编码须为2～50位，只能包含小写字母、数字、下划线和短横线，并以字母或数字开头',
          ]),
        },
      });
    },
  );
});

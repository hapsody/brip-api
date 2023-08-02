import nodemailer from 'nodemailer';
import { isNil } from 'lodash';
import { IBError } from '@src/utils/IBDefinitions';

const sendEmail = async (params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  try {
    const { from, to, subject, html } = params;

    const transporter = nodemailer.createTransport({
      service: (process.env.SYSTEM_EMAIL_SERVICE as string) || 'gmail', // 메일 보내는 곳
      port: !isNil(process.env.SYSTEM_EMAIL_PORT)
        ? Number(process.env.SYSTEM_EMAIL_PORT)
        : 587,
      host: (process.env.SYSTEM_EMAIL_HOST as string) || 'smtp.gmail.com',
      secure: true,
      // requireTLS: true,
      auth: {
        user: process.env.SYSTEM_EMAIL_SENDER as string, // 보내는 메일의 주소
        pass: process.env.SYSTEM_EMAIL_APPPASS as string, // 보내는 메일의 비밀번호
        // type: 'OAuth2',
        // user: process.env.OAUTH_USER as string,
        // clientId: process.env.OAUTH_CLIENT_ID as string,
        // clientSecret: process.env.OAUTH_CLIENT_SECRET as string,
        // refreshToken: process.env.OAUTH_REFRESH_TOKEN as string,
      },
      debug: true,
      logger: true,
    });

    // send mail with defined transport object
    // const info = await transporter.sendMail({
    await transporter.sendMail({
      from, // sender address
      to, // list of receivers
      subject, // Subject line
      // text: '', // plain text body
      html, // html body
    });
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `nodemailer 이메일 전송중 문제가 발생했습니다. \n\n ${
        (err as Error).message
      }`,
    });
  }
};

export default sendEmail;

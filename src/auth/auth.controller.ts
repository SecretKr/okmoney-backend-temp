import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Request,
    Res,
    UseGuards,
    Query,
    Body
  } from '@nestjs/common';
  import { AuthService } from './auth.service';
  import { AuthGuard } from '@nestjs/passport';
  import { GoogleAuthGuard } from './google.guard';
import { RefreshAuthGuard } from './refresh-auth.guard';
import { MockAuthGuard } from './mockAuthGuard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LineAuthGuard } from './line.guard';
import { HttpService } from '@nestjs/axios';
import * as qs from 'qs';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
  
  @Controller('auth')
  export class AuthController {
    constructor(private readonly authService: AuthService, private readonly httpService: HttpService) {}

    @Post('phone/login')
    async login(
      @Body('phone') phone: string,
      @Body('password') password: string,
    ){
      const token = await this.authService.phoneLogin(phone, password);
      console.log(token)
      if(token) return { accessToken: token.accessToken, refreshToken: token.refreshToken }
      return "Invalid PhoneNumber or Password"
    }

    @UseGuards(GoogleAuthGuard)
    @Get('google/login')
    googleLogin() {}
  
    @UseGuards(GoogleAuthGuard)
    @Get('google/callback')
    async googleCallback(@Req() req, @Res() res) {
        const user = req.user;
        if (!user) {
          return res.status(400).send('No user found');
        }
    
        const token = await this.authService.googleLogin(req);
        if (typeof token === 'string') {
            return res.status(400).send(token);
        }
        console.log(token)
        console.log(user.id)
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/google?token=${token.accessToken}&refreshToken=${token.refreshToken}&userId=${user.id}`;
        return res.redirect(302, redirectUrl);
    }

    @UseGuards(RefreshAuthGuard)
    @Post("refresh")
    refreshToken(@Req() req) {
      return this.authService.refreshToken(req);
    }

    @UseGuards(LineAuthGuard)
    @Get('line/login')
    lineLogin() {}

    @Get('line/callback')
    async lineCallback(
      @Query('code') code: string,
      @Res() res
    ) {
      const url = 'https://api.line.me/oauth2/v2.1/token';
      
      const data = qs.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'http://localhost:3000/api/auth/line/callback',
        client_id: process.env.LINE_CHANNEL_ID,
        client_secret: process.env.LINE_CHANNEL_SECRET,
      });
  
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
  
      try {
        const response = await firstValueFrom(
          this.httpService.post(url, data, { headers })
        );
        console.log(response.data);
        const lineId = jwt.decode(response.data.id_token)?.sub;
        
        const user = await this.authService.validateLineUser({
          email: "",
          firstName: "",
          lastName: "",
          storeName: "",
          rolePackage: "FREE",
          lineId: lineId,
        });

        const token = await this.authService.lineLogin(user.id);
        console.log('Generated tokens:', token);
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/line?token=${token.accessToken}&refreshToken=${token.refreshToken}`;
        return res.redirect(302, redirectUrl);

      } catch (error) {
        console.error('Error making POST request', error);
      }
    }

    @Get("test?")
    test(
        @Query('token') token: string,
        @Query('refreshToken') refreshToken: string,
    ) {
        return `Token: ${token}<br>RefreshToken: ${refreshToken}`
    }

    @UseGuards(JwtAuthGuard)
    @Get("test2")
    test2() {
        return `Success`
    }
  }
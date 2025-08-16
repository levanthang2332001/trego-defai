import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VoiceService } from './services/voice.service';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      // fileFilter: (_req, file, cb) => {
      //   if (!file.mimetype.match(/^audio\/(mpeg|mp4|wav|ogg|webm)$/)) {
      //     return cb(new Error('Only audio files are allowed!'), false);
      //   }
      //   cb(null, true);
      // },
      // limits: {
      //   fileSize: 10 * 1024 * 1024, // 10MB limit
      // },
    }),
  )
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ transcript: string }> {
    try {
      if (!file) {
        throw new Error('No audio file provided');
      }

      const transcript = await this.voiceService.transcribeAudio(file);
      return { transcript };
    } catch (error) {
      throw new Error(`Failed to transcribe audio: ${error as string}`);
    } finally {
      // Clean up the uploaded file after processing
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error(`Error deleting file ${file.path}:`, err);
        }
      });
    }
  }
}

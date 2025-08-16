import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { LoggerService } from 'src/chat/services/logger.service';

@Injectable()
export class VoiceService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService(VoiceService.name);
  }

  async transcribeAudio(file: Express.Multer.File): Promise<string> {
    try {
      this.logger.log('Starting audio transcription');

      const formData = new FormData();
      const fileBuffer = fs.readFileSync(file.path);
      formData.append(
        'file',
        new Blob([new Uint8Array(fileBuffer)], { type: file.mimetype }),
        file.originalname,
      );
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error('OpenAI Whisper API error:', error);
        throw new Error(`Whisper API failed: ${error}`);
      }

      const data = (await response.json()) as { text: string };
      fs.unlinkSync(file.path); // Clean up temporary file

      return data?.text;
    } catch (error) {
      this.logger.error('Failed to transcribe audio', error);
      throw error;
    }
  }

  // async textToSpeech(text: string): Promise<Buffer> {
  //   try {
  //     this.logger.log('Converting text to speech');

  //     const response = await fetch('https://api.openai.com/v1/audio/speech', {
  //       method: 'POST',
  //       headers: {
  //         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         model: 'tts-1',
  //         input: text,
  //         voice: 'alloy',
  //       }),
  //     });

  //     if (!response.ok) {
  //       const error = await response.text();
  //       this.logger.error('OpenAI TTS API error:', error);
  //       throw new Error(`TTS API failed: ${error}`);
  //     }

  //     return Buffer.from(await response.arrayBuffer());
  //   } catch (error) {
  //     this.logger.error('Failed to convert text to speech', error);
  //     throw error;
  //   }
  // }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'toj-vitamin-rep.apk');

    if (!fs.existsSync(filePath)) {
      return new NextResponse('APK file not found', { status: 404 });
    }

    const fileStat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    // Convert node read stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        fileStream.on('end', () => {
          controller.close();
        });
        fileStream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        fileStream.destroy();
      }
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="toj-vitamin-rep.apk"',
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Failed to serve APK:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

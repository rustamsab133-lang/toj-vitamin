
import { NextResponse } from 'next/server';
import * as bizSdk from 'facebook-nodejs-business-sdk';
import crypto from 'crypto';

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export async function POST(req: Request) {
  try {
    const { event_name, data, url } = await req.json();
    const userAgent = req.headers.get('user-agent') || '';
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 1. Meta CAPI Logic
    if (ACCESS_TOKEN && PIXEL_ID) {
      try {
        const AdsSdk = bizSdk.FacebookAdsApi.init(ACCESS_TOKEN);
        const UserData = bizSdk.UserData;
        const ServerEvent = bizSdk.ServerEvent;
        const EventRequest = bizSdk.EventRequest;

        const userData = new UserData()
          .setClientIpAddress(clientIp)
          .setClientUserAgent(userAgent);

        const serverEvent = new ServerEvent()
          .setEventName(event_name)
          .setEventTime(Math.floor(Date.now() / 1000))
          .setUserData(userData)
          .setEventSourceUrl(url)
          .setActionSource('website');

        if (data) serverEvent.setCustomData(data);

        await new EventRequest(ACCESS_TOKEN, PIXEL_ID).setEvents([serverEvent]).execute();
      } catch (metaErr) {
        console.error('Meta CAPI Error:', metaErr);
      }
    }

    // 2. Google Analytics Measurement Protocol (Server-side)
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
    const GA_SECRET = process.env.GA_API_SECRET;

    if (GA_ID && GA_SECRET) {
      try {
        const clientId = crypto.createHash('md5').update(clientIp + userAgent).digest('hex');
        
        await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_ID}&api_secret=${GA_SECRET}`, {
          method: 'POST',
          body: JSON.stringify({
            client_id: clientId,
            events: [{
              name: event_name,
              params: {
                ...data,
                page_location: url,
                engagement_time_msec: 100
              }
            }]
          })
        });
      } catch (gaErr) {
        console.error('GA MP Error:', gaErr);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Analytics Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAuthedUser } from "@/lib/auth/verifyRequest";
import { isYouTubeConfigured } from "@/lib/youtube/client";
export async function GET(request:Request){try{await requireAuthedUser(request);return NextResponse.json({configured:isYouTubeConfigured(),channelId:process.env.YOUTUBE_CHANNEL_ID??null})}catch{return NextResponse.json({error:"Unauthorized."},{status:401})}}

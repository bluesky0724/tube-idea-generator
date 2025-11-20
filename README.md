# YouTube AI Content Ideas Generator

A Next.js application that analyzes YouTube channels and generates AI-powered video ideas based on:
- Channel's recent video topics
- Latest relevant news
- Reddit discussions
- Channel's content style

## Features

- 🔍 Fetches last 10 videos from any YouTube channel
- 🤖 AI-powered topic analysis using OpenAI
- 📰 Fetches relevant news articles (today)
- 💬 Searches Reddit for related discussions
- ✨ Generates 5 video ideas with titles, thumbnail designs, and concepts

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `env.example` to `.env.local` and fill in your API keys:
   ```bash
   cp env.example .env.local
   ```
   
   Or create `.env.local` manually with the following variables:

   Required API keys:
   - `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - `YOUTUBE_API_KEY` - Get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
     - Enable "YouTube Data API v3" in your project
   - `NEWS_API_KEY` (optional) - Get from [NewsAPI](https://newsapi.org/)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter a YouTube channel URL in any of these formats:
   - `https://www.youtube.com/@channelname`
   - `https://www.youtube.com/c/channelname`
   - `https://www.youtube.com/channel/CHANNEL_ID`
   - `https://www.youtube.com/user/username`

2. Click "Generate Ideas"

3. Wait for the analysis to complete (this may take 30-60 seconds)

4. View the results:
   - Identified topics from the channel
   - Relevant news articles
   - Reddit discussions
   - 5 generated video ideas with titles, thumbnail designs, and concepts

## Architecture

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **AI**: OpenAI GPT-4o-mini for topic analysis and idea generation
- **APIs Used**:
  - YouTube Data API v3 for fetching videos
  - NewsAPI for fetching news (optional)
  - Reddit JSON API (public, no auth needed)

## Project Structure

```
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # Main API endpoint
│   ├── page.tsx                   # Main UI component
│   ├── page.module.css            # Styles
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── lib/
│   ├── youtube.ts                 # YouTube API integration
│   ├── openai.ts                  # OpenAI integration
│   ├── news.ts                    # News API integration
│   └── reddit.ts                  # Reddit search
└── package.json
```

## Notes

- The app uses OpenAI's GPT-4o-mini model for cost efficiency
- Reddit search uses the public API (no authentication required)
- News fetching is optional - the app will work without it
- YouTube API has daily quotas - be mindful of usage

## License

MIT


# qPdf - PDF Question Extractor

A Next.js application that allows users to upload PDF files, automatically extract questions from each page using AI, and view them alongside the PDF preview.

## Features

- 🎯 Drag-and-drop PDF upload (no button needed)
- 📊 Real-time upload progress bar
- 📄 PDF preview with pagination
- 🤖 AI-powered question extraction from PDF pages
- 💾 Supabase storage integration
- 🎨 Modern, responsive UI

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_F_8FT5YH9MQZy30DPy9i5Q_73xmQVHK
   ```

   **Important:** Replace `your_supabase_project_url` with your actual Supabase project URL (found in your Supabase dashboard under Settings > API).

3. **Set up Supabase Storage:**
   - Go to your Supabase dashboard
   - Navigate to Storage
   - Create a bucket named `uploads`
   - Make sure it's set to public or configure RLS policies as needed

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How it works

1. **Upload:** Users drag and drop a PDF file on the homepage
2. **Storage:** The PDF is uploaded to Supabase Storage bucket `uploads`
3. **Processing:** Each page is converted to an image and sent to OpenRouter API (GPT-4o) for question extraction
4. **Display:** The details page shows the PDF preview on the left and extracted questions on the right, with pagination support

## Tech Stack

- **Next.js 14** - React framework
- **Supabase** - File storage and backend
- **react-pdf** - PDF rendering
- **pdf-lib** - PDF manipulation
- **pdfjs-dist** - PDF.js for page-to-image conversion
- **OpenRouter API** - AI question extraction
- **Tailwind CSS** - Styling

## Notes

- Large PDFs are processed page-by-page for efficiency
- Questions are extracted using GPT-4o via OpenRouter API
- The API key is stored server-side in the API route for security

# scoorlydec25

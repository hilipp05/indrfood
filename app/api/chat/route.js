import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Inisialisasi Gemini menggunakan API Key yang tadi dimasukkan ke .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    // Mengambil data prompt/pertanyaan dari frontend
    const body = await request.json();
    const prompt = body.prompt;

    // Menentukan model Gemini yang akan digunakan (Gemini 2.5 Flash sangat cepat dan hemat)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Mengirim permintaan ke server Google Gemini
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Mengembalikan jawaban dari Gemini ke frontend dalam format JSON
    return NextResponse.json({ message: text });
    
  } catch (error) {
    console.error("Error pada API Gemini:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
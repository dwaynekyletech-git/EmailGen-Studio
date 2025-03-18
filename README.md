# EmailGen Studio

EmailGen Studio is a powerful tool designed for email developers, marketing teams, and businesses migrating to Salesforce Marketing Cloud (SFMC) from platforms like Adobe Campaign. It automates tedious email development tasks through AI-powered conversion, secure authentication, live code editing, custom QA validation, robust version control, and one-click deployment to SFMC.

## Features

- AI-powered conversion of design files (.psd, .xd, .fig) to responsive HTML emails
- Live code editor with syntax highlighting and linting
- Custom QA validation rules for client-specific guidelines
- Render testing via Litmus/Email on Acid
- Version control for email templates
- One-click deployment to Salesforce Marketing Cloud
- Secure authentication with role-based access

## Tech Stack

- Next.js 14 (App Router)
- ShadCN UI components
- Supabase for database and file storage
- Clerk for authentication
- AI SDK for file conversion
- Vercel for deployment
- Litmus/Email on Acid APIs for render testing
- CodeMirror for live code editing

## Getting Started

### Prerequisites

- Node.js v20.2.1 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/emailgen-studio.git
   cd emailgen-studio
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in the required environment variables

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/src/app`: Next.js 14 App Router pages and layouts
- `/src/app/api`: API routes with Route Handlers
- `/src/app/auth`: Authentication pages
- `/src/app/dashboard`: Dashboard components
- `/src/app/qa`: QA validation pages
- `/src/backend`: Backend services and utilities
- `/src/components`: Reusable UI components

## License

[MIT](LICENSE)

## AI-Powered Design to HTML Conversion

EmailGen Studio uses Google's Gemini 1.5 Flash to convert design files into responsive HTML emails optimized for Salesforce Marketing Cloud. 

**Supported File Types**: 
- PNG and JPG images of your designs

The conversion process follows these steps:

1. **File Upload**: Users upload their design files through an intuitive drag-and-drop interface.
2. **Visual Analysis**: Gemini's vision capabilities analyze the design file to understand the visual elements, layout, colors, and typography.
3. **HTML Generation**: The AI generates responsive HTML email code that is compatible with email clients and follows best practices.
4. **Code Review**: Users can review and edit the generated HTML in a live code editor.
5. **QA Validation**: The email HTML is processed through custom QA checks for accessibility, compliance, and brand guidelines.
6. **Render Testing**: The system integrates with email testing services to simulate rendering across multiple email clients.
7. **Deployment**: Users can deploy the finalized HTML email directly to Salesforce Marketing Cloud.

### Environment Setup

To use the AI conversion feature, you need to set up the following environment variables:

```
# AI Services
GEMINI_API_KEY=your_gemini_api_key
```

You can get an API key from [Google AI Studio](https://makersuite.google.com/).

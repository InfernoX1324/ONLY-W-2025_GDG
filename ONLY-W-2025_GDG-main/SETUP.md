# Quick Setup Guide

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

**Backend (Node.js):**
```bash
cd backend
npm install
```

**Python:**
```bash
pip install -r requirements.txt
```

### Step 2: Configure API Key

1. Copy `.env.example` to `.env` in the `backend` folder:
```bash
cd backend
copy .env.example .env  # Windows
# OR
cp .env.example .env    # Mac/Linux
```

2. Edit `.env` and add your Google Gemini API key:
```
GOOGLE_API_KEY=your_actual_api_key_here
```

**Get API Key:** Visit [Google AI Studio](https://makersuite.google.com/app/apikey)

### Step 3: Start the Server

```bash
cd backend
npm start
```

### Step 4: Open in Browser

Navigate to: **http://localhost:3000**

## ✅ Verify Installation

1. ✅ Server starts without errors
2. ✅ Browser opens to landing page
3. ✅ Can upload a CSV file
4. ✅ Analysis completes successfully
5. ✅ Chart displays on dashboard
6. ✅ AI assistant responds (if API key configured)

## 🎯 Test with Sample Data

1. Create a simple CSV file with numeric columns
2. Upload it through the interface
3. Select a target column
4. Click "Start Analysis"
5. View results on the dashboard

## 📞 Need Help?

- Check `README.md` for detailed documentation
- Review console logs for error messages
- Ensure all prerequisites are installed


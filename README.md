# 🤝 Negotiation Game - AI Deal Maker

Welcome to the **Negotiation Game**! This is a real-time negotiation simulator where you can test your bargaining skills against various AI personalities. Powered by **Groq** (LLaMA 3.3 70B), the seller responds dynamically based on your arguments.

## 🚀 Features

- **Dynamic AI Personalities:** Negotiate with "The Anchor", "The Eager Closer", "The Skeptic", and more.
- **Real-time Feedback:** The AI evaluates your arguments and changes its "Willingness Score".
- **Leaderboard:** Compete for the highest scores based on discounts obtained and efficiency.
- **Modern UI:** Built with React, Tailwind CSS, and Framer Motion for a premium experience.

## 🛠️ Technology Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express + TSX
- **AI Engine:** Groq SDK (Llama 3.3 70B Versatile)
- **Styling:** CSS + Lucide Icons

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone <repository-url>
cd Negotiation
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and add your Groq API Keys. We support up to 3 keys for automatic rotation if one hits a rate limit:

```env
GROQ_API_KEY_1="your_first_key"
GROQ_API_KEY_2="your_second_key_optional"
GROQ_API_KEY_3="your_third_key_optional"
```

> **Note:** You can get your free API key from [console.groq.com](https://console.groq.com/keys).

### 4. Run the Application
Start the development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

## 🎮 How to Play

1. Choose a product from the list (e.g., Rolex, Vintage Camera).
2. Start chatting with the seller.
3. Make offers and provide logical arguments to lower the price.
4. Try to reach a deal before the seller walks away (maximum 8 rounds).
5. Check the leaderboard to see how you rank against others!

## 📜 License
MIT License - Feel free to use and modify for your own projects.

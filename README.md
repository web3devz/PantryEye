# 👁️ PantryEye

> **Privacy-First Smart Pantry Management**  
> Never run out of essentials again. Track inventory, predict consumption, and automate shopping—all while keeping your data completely private.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Private-red.svg)]()

---

## ✨ Features

### 🔒 **Privacy-First Architecture**
- **100% Local Processing** - All ML/AI runs on your device
- **End-to-End Encryption** - AES-GCM encryption for all stored data
- **No Cloud Storage** - Your data never leaves your device
- **Zero Tracking** - No analytics, no telemetry, complete privacy

### 📸 **Smart Capture**
- **Camera Detection** - Point your camera at items for instant recognition
- **Image Upload** - Upload photos from your device
- **Receipt OCR** - Scan receipts to automatically add purchased items
- **Real-time Processing** - Instant feedback with confidence scores

### 🤖 **AI-Powered Forecasting**
- **Consumption Tracking** - Learns your usage patterns over time
- **Predictive Analytics** - Forecasts when items will run out
- **Smart Alerts** - Color-coded warnings (🔴 urgent, 🟡 soon, ✓ sufficient)
- **Exponential Smoothing** - Advanced algorithms reduce noise for accurate predictions

### 🛒 **Automated Shopping**
- **Smart Cart Building** - Automatically generates shopping lists
- **Brand Preferences** - Respects your preferred brands by category
- **Spending Caps** - Stay within budget with automatic limits
- **Multi-Vendor Support** - Amazon, Walmart, and more
- **Substitute Suggestions** - Ranked alternatives when items are unavailable

### 📊 **Inventory Management**
- **Real-time Dashboard** - See all items at a glance
- **Manual Entry** - Add items with custom quantities and units
- **Bulk Operations** - Edit, delete, and manage multiple items
- **History Tracking** - Complete audit log of all changes
- **Low Stock Alerts** - Visual indicators for items needing restock

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/web3devz/PantryEye
cd PantryEye

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:5173/**

### First Time Setup

1. **Create Account** - Set your password and household preferences
2. **Add Items** - Use camera, upload receipts, or add manually
3. **Track Usage** - Update quantities as you consume items
4. **Get Forecasts** - After 2+ data points, see consumption predictions
5. **Auto-Shop** - Review and approve automatically generated carts

---

## 🎯 How It Works

### 1. **Capture Items**
Choose your preferred method:
- 📷 **Take Photo** - Use your device camera
- 🖼️ **Upload Image** - Select from your photo library
- 📄 **Scan Receipt** - Extract items from purchase receipts
- ✍️ **Manual Entry** - Type in item details

### 2. **Track Consumption**
The system automatically:
- Records quantity changes over time
- Calculates consumption velocity (items per day)
- Applies exponential smoothing to reduce noise
- Builds a consumption history for each item

### 3. **Get Predictions**
AI forecasting provides:
- **Days until runout** - Based on current velocity
- **Confidence scores** - Higher with more data points
- **Visual indicators** - Color-coded urgency levels
- **Restock alerts** - Notifications when items are low

### 4. **Automated Shopping**
Smart cart generation:
- Identifies items needing restock (≤5 days or out of stock)
- Searches marketplace catalogs for matching products
- Applies your brand preferences and spending limits
- Generates explanations for each item selection
- Allows review, editing, and approval before ordering

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Styling** | CSS3 with modern gradients & animations |
| **Storage** | IndexedDB with encryption |
| **Encryption** | AES-GCM (Web Crypto API) |
| **ML/CV** | YOLO-tiny (WebAssembly) |
| **OCR** | Tesseract.js |
| **Testing** | Vitest + fast-check |

### Project Structure

```
pantry-eye/
├── src/
│   ├── components/          # React UI components
│   │   ├── AuthScreen.tsx   # Authentication & onboarding
│   │   ├── LandingPage.tsx  # Modern landing page
│   │   ├── CameraPage.tsx   # Camera/upload mode selector
│   │   ├── CameraCapture.tsx # Camera & image processing
│   │   ├── ReceiptUpload.tsx # Receipt OCR processing
│   │   ├── InventoryList.tsx # Inventory dashboard
│   │   ├── CartManagement.tsx # Shopping cart system
│   │   └── ...
│   ├── services/            # Business logic & APIs
│   │   ├── auth/           # Authentication & encryption
│   │   ├── inventory/      # Inventory management
│   │   ├── forecast/       # AI consumption prediction
│   │   ├── cart/           # Shopping cart builder
│   │   ├── cv/             # Computer vision (YOLO)
│   │   ├── ocr/            # Receipt text extraction
│   │   ├── sku/            # Product SKU mapping
│   │   ├── storage/        # Encrypted IndexedDB
│   │   └── sandbox/        # Marketplace API client
│   ├── contexts/           # React context providers
│   ├── types/              # TypeScript type definitions
│   ├── test/               # Test utilities & generators
│   └── index.css           # Global styles
├── .kiro/specs/            # Requirements & design docs
└── package.json
```

---

## 🧪 Testing

### Test Strategy

The project uses **two complementary approaches**:

1. **Unit Tests** - Verify specific examples and edge cases
2. **Property-Based Tests** - Verify universal properties using fast-check

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run with UI
npm run test -- --ui
```

### Test Coverage

- ✅ Authentication & encryption
- ✅ Inventory CRUD operations
- ✅ Forecast calculations
- ✅ Cart building logic
- ✅ SKU mapping
- ✅ Storage operations
- ✅ Integration scenarios

All property-based tests run **100+ iterations** for thorough coverage.

---

## 🎨 UI/UX Features

### Modern Design
- **Gradient Backgrounds** - Beautiful color transitions
- **Glassmorphism** - Frosted glass effects with backdrop blur
- **Smooth Animations** - Fade-ins, hover effects, and transitions
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Dark Theme** - Easy on the eyes with high contrast

### User Experience
- **Intuitive Navigation** - Clear tabs and visual hierarchy
- **Real-time Feedback** - Loading states and progress indicators
- **Error Handling** - Helpful error messages with suggestions
- **Confirmation Dialogs** - Prevent accidental deletions
- **Keyboard Shortcuts** - Efficient navigation for power users

---

## 🔐 Security & Privacy

### Data Protection
- **Local-First** - All data stored on your device
- **AES-GCM Encryption** - Military-grade encryption for stored data
- **Secure Key Derivation** - PBKDF2 with 100,000 iterations
- **No Network Calls** - ML processing happens entirely offline
- **Audit Logging** - Complete history of all operations

### Privacy Guarantees
- ❌ No user tracking
- ❌ No analytics
- ❌ No cloud storage
- ❌ No data sharing
- ✅ Complete data ownership
- ✅ Offline-capable
- ✅ Open source (private repo)

---

## 📖 Documentation

### For Users
- **Getting Started Guide** - See "Quick Start" above
- **Feature Tutorials** - In-app tooltips and help text
- **FAQ** - Common questions answered in UI

### For Developers
- **Requirements** - `.kiro/specs/pantry-eye/requirements.md`
- **Design Docs** - `.kiro/specs/pantry-eye/design.md`
- **Task Breakdown** - `.kiro/specs/pantry-eye/tasks.md`
- **API Documentation** - JSDoc comments in source code
- **Test Examples** - See `*.test.ts` files

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with HMR

# Building
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode

# Code Quality
npm run lint            # Run ESLint (if configured)
npm run type-check      # Run TypeScript compiler check
```

### Development Workflow

1. **Spec-Driven Development** - Start with requirements in `.kiro/specs/`
2. **Type-First** - Define TypeScript interfaces before implementation
3. **Test-Driven** - Write tests alongside features
4. **Incremental** - Small, focused commits
5. **Review** - Self-review before committing

---

## 🤝 Contributing

This is a private project. For questions or suggestions, contact the maintainer.

---

## 📝 License

**Private Project** - All rights reserved.


## 📧 Contact

For questions, issues, or feedback, please contact the project maintainer.

---

<div align="center">

**Built with ❤️ for privacy-conscious users**

*Never run out of essentials again.*

</div>

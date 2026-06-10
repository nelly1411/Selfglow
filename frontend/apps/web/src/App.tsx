import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { CartProvider } from './context/CartContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import About from './pages/About'
import SkinQuiz from '@/pages/SkinQuiz'
import Cart from './pages/Cart'
import Chatbot from './pages/Chatbot'
import Wishlist from './pages/Wishlist'
import Login from './pages/Login'
import ProductDetail from './pages/ProductDetail'
import { WishlistProvider } from './context/WishlistContext'
import { ReviewsProvider } from '@/context/ReviewsContext'
import Checkout from './pages/Checkout'
import Profile from './pages/Profile'
import { useAuth } from './context/AuthContext'
import ThankYou from './pages/ThankYou'
import OrderDetail from './pages/OrderDetail.tsx'
import Hautwissen from './pages/Hautwissen.tsx'
import HautwissenDetail from './pages/HautwissenDetail'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <ReviewsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="shop" element={<Shop />} />
              <Route path="about" element={<About />} />
              <Route path="cart" element={<Cart />} />
              <Route path="chatbot" element={<Chatbot />} />
              <Route path="login" element={<Login />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/quiz" element={<SkinQuiz />} />
              <Route path="/hautwissen" element={<Hautwissen />} />
              <Route path="/hautwissen/:slug" element={<HautwissenDetail />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
  path="/profile/orders/:orderId"
  element={
    <ProtectedRoute>
      <OrderDetail />
    </ProtectedRoute>
  }
/>
            </Route>
          </Routes>
        </ReviewsProvider>
      </WishlistProvider>
    </CartProvider>
  )
}

export default App

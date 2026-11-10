import type { ScreenRoute } from '../routes'
import HomePage from '../pages/shop/Home'
import CategoryPage from '../pages/shop/Category'
import ProductListPage from '../pages/shop/ProductList'
import SearchPage from '../pages/shop/Search'
import ProductDetailPage from '../pages/shop/ProductDetail'
import DetailMatchPage from '../pages/shop/DetailMatch'
import ReviewsPage from '../pages/shop/Reviews'
import ReviewWritePage from '../pages/shop/ReviewWrite'
import WishlistPage from '../pages/shop/Wishlist'
import NotificationsPage from '../pages/shop/Notifications'
import SurveyIntroPage from '../pages/shop/SurveyIntro'
import SurveyPage from '../pages/shop/Survey'
import SurveyResultPage from '../pages/shop/SurveyResult'
import RecommendPage from '../pages/shop/Recommend'
import ChatbotPage from '../pages/shop/Chatbot'

/** 구매자 · 쇼핑 (홈·카테고리·상품·리뷰·찜·알림·AI) */
export const buyerShopScreens: ScreenRoute[] = [
  { path: '/', title: '홈', group: '구매자', element: <HomePage /> },
  { path: '/category', title: '카테고리', group: '구매자', element: <CategoryPage /> },
  { path: '/search', title: '검색 (최근·인기 급상승·카테고리)', group: '구매자', element: <SearchPage /> },
  { path: '/products', title: '상품 목록·검색', group: '구매자', element: <ProductListPage /> },
  { path: '/product/:productId', demo: '/product/1', title: '상품 상세', group: '구매자', element: <ProductDetailPage /> },
  {
    path: '/product/:productId/match',
    demo: '/product/1/match',
    title: '상품 상세 · AI 매칭',
    group: '구매자',
    element: <DetailMatchPage />,
  },
  {
    path: '/product/:productId/reviews',
    demo: '/product/1/reviews',
    title: '상품 리뷰',
    group: '구매자',
    element: <ReviewsPage />,
  },
  {
    path: '/reviews/write',
    demo: '/reviews/write?orderItemId=1',
    title: '리뷰 작성',
    group: '구매자',
    element: <ReviewWritePage />,
    auth: 'login',
  },
  { path: '/wishlist', title: '찜', group: '구매자', element: <WishlistPage />, auth: 'login' },
  { path: '/notifications', title: '알림', group: '구매자', element: <NotificationsPage />, auth: 'login' },
  { path: '/survey', title: '뷰티 설문 소개', group: '구매자', element: <SurveyIntroPage />, auth: 'login' },
  { path: '/survey/questions', title: '뷰티 설문', group: '구매자', element: <SurveyPage />, auth: 'login' },
  { path: '/survey/result', title: '내 뷰티 프로필', group: '구매자', element: <SurveyResultPage />, auth: 'login' },
  { path: '/recommend', title: '맞춤 추천', group: '구매자', element: <RecommendPage />, auth: 'login' },
  { path: '/chatbot', title: '팔레트 챗봇', group: '구매자', element: <ChatbotPage />, auth: 'login' },
]

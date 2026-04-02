import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { BooksPage } from "@/pages/BooksPage";
import { ReaderPage } from "@/pages/ReaderPage";
import { ListenPage } from "@/pages/ListenPage";
import { SearchPage } from "@/pages/SearchPage";
import { VoiceStudioPage } from "@/pages/VoiceStudioPage";
import { AuthPage } from "@/pages/AuthPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="books" element={<BooksPage />} />
        <Route path="listen" element={<ListenPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="voices" element={<VoiceStudioPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="read/:bookId/:chapter" element={<ReaderPage />} />
      </Route>
    </Routes>
  );
}

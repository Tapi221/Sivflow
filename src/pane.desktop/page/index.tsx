import "@/pane.desktop/page/index.css";
import React from "react";



const Breadcrumb = () => {
  return (
    <nav
      aria-label="パンくず"
      className="text-[var(--ds-typography-font-size-sm)] font-medium leading-6 text-[#8e919c]"
    >
      <span>ホーム</span>
      <span className="mx-2">/</span>
      <span className="text-[#74798b]">カレンダー</span>
    </nav>
  );
};
const CalendarSection = () => {
  return (
    <section className="w-full rounded-lg bg-[#f5f5f5] px-6 py-6">
      <h1 className="text-[var(--ds-typography-font-size-lg)] font-bold leading-8 text-[#25272d]">
        カレンダー
      </h1>
      <div className="mt-4 min-h-56" />
    </section>
  );
};
const Main = () => {
  return (
    <main className="main-container min-h-screen bg-white">
      <div className="mx-auto w-full max-w-96 px-6 py-6">
        <div className="flex flex-col gap-4">
          <Breadcrumb />
          <CalendarSection />
        </div>
      </div>
    </main>
  );
};



export default Main;

import React from "react";
import "./index.css";

const Breadcrumb = () => {
  return (
    <nav
      aria-label="パンくず"
      className="text-[14px] font-medium leading-[22px] text-[#8e919c]"
    >
      <span>ホーム</span>
      <span className="mx-2">/</span>
      <span className="text-[#74798b]">カレンダー</span>
    </nav>
  );
};

const CalendarSection = () => {
  return (
    <section className="w-full rounded-[8px] bg-[#f5f5f5] px-6 py-6">
      <h1 className="text-[20px] font-bold leading-[32px] text-[#25272d]">
        カレンダー
      </h1>
      <div className="mt-4 min-h-[220px]" />
    </section>
  );
};

const Main = () => {
  return (
    <main className="main-container min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1220px] px-[24px] py-[24px]">
        <div className="flex flex-col gap-4">
          <Breadcrumb />
          <CalendarSection />
        </div>
      </div>
    </main>
  );
};

export default Main;

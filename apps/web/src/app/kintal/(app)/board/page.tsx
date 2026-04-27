import type { Metadata } from "next";
import { fetchStaff } from "@/features/kintal/acessos/data";
import { fetchCards } from "@/features/kintal/board/data";
import { BoardPageHeader } from "@/features/kintal/board/sections/page-header";
import { Board } from "@/features/kintal/board/components/board";

export const metadata: Metadata = {
  title: "Board",
};

export default async function KintalBoardPage() {
  const [cards, staff] = await Promise.all([fetchCards(), fetchStaff()]);

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <BoardPageHeader totalCards={cards.length} staff={staff} />

      <div className="mt-8">
        <Board initialCards={cards} staff={staff} />
      </div>
    </div>
  );
}

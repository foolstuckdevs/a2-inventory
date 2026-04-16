import { Suspense } from "react";
import { getTransactions } from "@/lib/actions/transactions";
import { getItems } from "@/lib/actions/items";
import { TransactionsClient } from "./client";
import PageLoading from "./loading";

async function TransactionsData() {
  const [transactions, items] = await Promise.all([
    getTransactions(),
    getItems(),
  ]);
  return (
    <TransactionsClient
      transactions={transactions as never[]}
      items={items as never[]}
    />
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TransactionsData />
    </Suspense>
  );
}

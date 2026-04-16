import { getTransactions } from "@/lib/actions/transactions";
import { getItems } from "@/lib/actions/items";
import { TransactionsClient } from "./client";

export default async function TransactionsPage() {
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

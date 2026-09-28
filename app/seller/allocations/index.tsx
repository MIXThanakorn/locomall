import { Redirect } from "expo-router";

export default function SellerAllocationsRedirect() {
  return <Redirect href={"/(tabs)/orders?view=selling" as never} />;
}

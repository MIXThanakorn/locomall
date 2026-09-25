import { Redirect } from "expo-router";

export default function RetiredAdminSecurityRoute() {
  return <Redirect href={"/admin" as any} />;
}

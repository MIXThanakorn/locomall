import { Redirect, useLocalSearchParams } from "expo-router";
export default function CreateStoreRedirect(){const{marketId}=useLocalSearchParams<{marketId:string}>();return <Redirect href={{pathname:"/seller/listings/join",params:{marketId:marketId??""}} as any}/>}

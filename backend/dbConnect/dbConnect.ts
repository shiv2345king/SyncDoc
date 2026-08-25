import mongoose from "mongoose";

type Connection = {
     isConnected : number;
}

const isConnected : Connection = {
    isConnected : 0,
}

export default async function dbConnect() {
      isConnected.isConnected = mongoose.connections[0].readyState;
     

}
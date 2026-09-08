import mongoose from "mongoose";

type Connection = {
     isConnected : number;
}

const isConnected : Connection = {
    isConnected : 0,
}

export default async function dbConnect() {
      if(isConnected.isConnected) {
        console.log("Already connected to database");
        return;
      }
      try
      {
          const db = await mongoose.connect(process.env.MONGODB_URI as string);
            isConnected.isConnected = 1;
            console.log("Connected to database");
      }
      catch(err)
      {
          console.log("Error connecting to database",err);
      }

}
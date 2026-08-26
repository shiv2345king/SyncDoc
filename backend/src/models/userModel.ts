import {Schema,model,Types} from "mongoose";

interface IOAuthProvider {
    provider: "google" | "github" ;
    providerId : string;
}

interface IUser {
    _id: Types.ObjectId;
    email: string;
    name: string;
    passwordHashed?: string;
    avatarUrl?:string;
    oAuthProviders: IOAuthProvider[];
    timestamps:{
        createdAt: Date;
    }
}

const userSchema = new Schema<IUser>({
    email: {type:String,required:true,unique:true},
    name: {type:String,required:true},
    passwordHashed: {type:String,required:false},
    avatarUrl: {type:String,required:false},
    oAuthProviders: [{
        provider: {type:String,enum:["google","github"],required:true},
        providerId: {type:String,required:true}
    }],
    timestamps: {
        createdAt: {type: Date, default: Date.now}
    }
});
export const UserModel = model<IUser>("User", userSchema);

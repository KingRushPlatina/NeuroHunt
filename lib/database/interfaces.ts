import { ObjectId } from 'mongodb';

export interface BaseDocument {
  _id?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IpDocument extends BaseDocument {
  ip: string;
  country?: string;
  city?: string;
  isp?: string;
  latitude?: number;
  longitude?: number;
  lastSeen: Date;
  visits: number;
}
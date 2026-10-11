import {Platform} from 'react-native';
export type PublishImage={uri:string;name:string;type:string;size:number};
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Validates the React Native image descriptor before a domain hands it to its API. */
export function isValidPublishImages(value: unknown, max: number, allowGif: boolean): boolean {
 const types = allowGif ? [...IMAGE_TYPES, 'image/gif'] : IMAGE_TYPES;
 return value === '' || Array.isArray(value) && value.length <= max && value.every(image =>
  image && typeof image === 'object' && typeof image.uri === 'string' && /^(file:|content:|blob:)/.test(image.uri) &&
  typeof image.name === 'string' && image.name.length > 0 && typeof image.size === 'number' && image.size > 0 &&
  image.size <= 8 * 1024 * 1024 && types.includes(image.type)
 );
}
/** React Native uses file descriptors; browsers require Blob rather than an object coerced to text. */
export async function appendPublishImage(form: FormData, image: PublishImage): Promise<void> {
 if(Platform.OS==='web') {
  const response=await fetch(image.uri);
  if(!response.ok)throw {kind:'content'};
  form.append('images',await response.blob(),image.name);
 } else form.append('images',{uri:image.uri,name:image.name,type:image.type} as unknown as Blob);
}

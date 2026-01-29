// authService.ts
import { signInAnonymously, UserCredential } from 'firebase/auth';
import { auth } from './firebase';

export async function loginUserAnonymously(): Promise<string | null> {
  try {
    const userCredential: UserCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log('Successfully signed in anonymously. User UID:', user.uid);
    return user.uid;
  } catch (error: any) {
    console.error('Anonymous sign-in failed:', error.message);
    return null;
  }
}
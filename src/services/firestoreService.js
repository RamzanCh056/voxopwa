import { db } from '../firebase/config';
import {
  collection, addDoc, getDocs, getDoc,
  doc, updateDoc, deleteDoc, query,
  orderBy, serverTimestamp,
} from 'firebase/firestore';

function handleFirestoreError(err, context) {
  if (err.code === 'permission-denied') {
    console.error(
      `%c Firestore Permission Denied (${context})\n` +
      'Go to Firebase Console → Firestore Database → Rules and set:\n\n' +
      "rules_version = '2';\nservice cloud.firestore {\n" +
      '  match /databases/{database}/documents {\n' +
      '    match /users/{userId}/{document=**} {\n' +
      '      allow read, write: if request.auth != null && request.auth.uid == userId;\n' +
      '    }\n  }\n}',
      'color:red;font-weight:bold;font-size:13px'
    )
  }
  throw err
}

export const saveRecordingMeta = async (userId, data) => {
  try {
    const ref = await addDoc(collection(db, 'users', userId, 'recordings'), {
      ...data,
      audioBlob: null,
      createdAt: serverTimestamp(),
    })
    return ref.id
  } catch (err) { handleFirestoreError(err, 'saveRecordingMeta') }
}

export const getRecordingsMeta = async (userId) => {
  try {
    const q = query(
      collection(db, 'users', userId, 'recordings'),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) { handleFirestoreError(err, 'getRecordingsMeta') }
}

export const getRecordingMeta = async (userId, recordingId) => {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'recordings', recordingId))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  } catch (err) { handleFirestoreError(err, 'getRecordingMeta') }
}

export const updateRecordingMeta = async (userId, recordingId, updates) => {
  try {
    await updateDoc(doc(db, 'users', userId, 'recordings', recordingId), updates)
  } catch (err) { handleFirestoreError(err, 'updateRecordingMeta') }
}

export const deleteRecordingMeta = async (userId, recordingId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'recordings', recordingId))
  } catch (err) { handleFirestoreError(err, 'deleteRecordingMeta') }
}

export const saveAnalysis = async (userId, recordingId, analysis) => {
  try {
    await updateDoc(doc(db, 'users', userId, 'recordings', recordingId), {
      analysis,
      analysisStatus: 'done',
      analyzedAt: serverTimestamp(),
    })
  } catch (err) { handleFirestoreError(err, 'saveAnalysis') }
}

export const saveUserProfile = async (userId, data) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  } catch (err) { handleFirestoreError(err, 'saveUserProfile') }
}

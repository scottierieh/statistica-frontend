'use client';

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  updateDoc,
  addDoc,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { Survey, SurveyResponse } from '@/entities/Survey';

export const surveyService = {
  async saveSurvey(db: Firestore, survey: Partial<Survey>, userId: string) {
    const surveyId = survey.id || doc(collection(db, 'surveys')).id;
    const surveyRef = doc(db, 'surveys', surveyId);
    
    const data = {
      ...survey,
      id: surveyId,
      ownerId: userId,
      updatedAt: serverTimestamp(),
      created_date: survey.created_date || new Date().toISOString()
    };

    try {
      console.log('SAVING SURVEY:', surveyId, 'userId:', userId, 'db:', !!db);
      await setDoc(surveyRef, data, { merge: true });
      return surveyId;
    } catch (serverError: any) {
      console.error('RAW_SAVE_ERROR:', serverError.code, serverError.message, serverError);
      const permissionError = new FirestorePermissionError({
        path: surveyRef.path,
        operation: survey.id ? 'update' : 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
    }
  },

  async getSurveys(db: Firestore, userId: string) {
    const surveysRef = collection(db, 'surveys');
    const q = query(
      surveysRef, 
      where('ownerId', '==', userId),
      orderBy('created_date', 'desc')
    );

    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Survey);
    } catch (serverError: any) {
      console.error('RAW_GET_SURVEYS_ERROR:', serverError.code, serverError.message, serverError);
      const permissionError = new FirestorePermissionError({
        path: surveysRef.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
    }
  },

  async getSurvey(db: Firestore, surveyId: string) {
    const surveyRef = doc(db, 'surveys', surveyId);
    try {
      const docSnap = await getDoc(surveyRef);
      return docSnap.exists() ? (docSnap.data() as Survey) : null;
    } catch (serverError: any) {
      console.error('RAW_GET_SURVEY_ERROR:', serverError.code, serverError.message, serverError);
      const permissionError = new FirestorePermissionError({
        path: surveyRef.path,
        operation: 'get',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
    }
  },

  async submitResponse(db: Firestore, surveyId: string, response: Partial<SurveyResponse>) {
    const responsesRef = collection(db, 'surveys', surveyId, 'responses');
    const data = {
      ...response,
      survey_id: surveyId,
      submittedAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(responsesRef, data);
      return docRef.id;
    } catch (serverError: any) {
      console.error('RAW_SUBMIT_ERROR:', serverError.code, serverError.message, serverError);
      const permissionError = new FirestorePermissionError({
        path: responsesRef.path,
        operation: 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
    }
  },

  async getResponses(db: Firestore, surveyId: string) {
    const responsesRef = collection(db, 'surveys', surveyId, 'responses');
    try {
      const querySnapshot = await getDocs(responsesRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SurveyResponse);
    } catch (serverError: any) {
      console.error('RAW_GET_RESPONSES_ERROR:', serverError.code, serverError.message, serverError);
      const permissionError = new FirestorePermissionError({
        path: responsesRef.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
    }
  },

  async deleteSurvey(db: Firestore, surveyId: string) {
    const surveyRef = doc(db, 'surveys', surveyId);
    try {
      await deleteDoc(surveyRef);
    } catch (serverError: any) {
      console.error('RAW_DELETE_ERROR:', serverError.code, serverError.message, serverError);
      const permissionError = new FirestorePermissionError({
        path: surveyRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
    }
  }
};
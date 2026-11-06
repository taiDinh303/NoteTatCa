import {createContext} from 'react';
import type {useNoteBack} from './useNoteBack';
export const NoteBackContext=createContext<(ReturnType<typeof useNoteBack>&{register:(handler:{close:()=>void;dirty:()=>boolean})=>()=>void})|null>(null);

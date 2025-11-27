import React, { useState, useEffect, useMemo, useCallback } from 'react';

// SCRIPT URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrXxhHNWtz6a5bNCNNP2xvZorw6SC56neUCmsxVq54b4M8M7XvLUqL092zD054FW1w/exec';

const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid var(--brand-color)', borderRight: '3px solid transparent' }}></div>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;


// --- AVATAR SYSTEM (copied from index.tsx) ---
const AvatarOne = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#58b0e0"/><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z"/><path fill="#60350a" fillRule="evenodd" d="M45.487 19.987l-29.173.175s1.048 16.148-2.619 21.21h35.701c-.92-1.35-3.353-1.785-3.909-21.385z"/><path fill="#d5e1ed" fillRule="evenodd" d="M18.135 45.599l7.206-3.187 11.55-.3 7.42 3.897-5.357 11.215-7.613 4.088-7.875-4.35-5.331-11.363z"/><path fill="#f9dca4" fillRule="evenodd" d="M24.744 38.68l12.931.084v8.949l-12.931-.085V38.68z"/><path fillRule="evenodd" opacity=".11" d="M37.677 38.778v3.58a9.168 9.168 0 0 1-.04 1.226 6.898 6.898 0 0 1-.313 1.327c-4.37 4.165-11.379.78-12.49-6.333z"/><path fill="#434955" fillRule="evenodd" d="M52.797 52.701a30.896 30.896 0 0 1-44.08-.293l1.221-3.098 9.103-4.122c3.262 5.98 6.81 11.524 12.317 15.455A45.397 45.397 0 0 0 43.2 45.483l8.144 3.853z"/><path fill="#f9dca4" fillRule="evenodd" d="M19.11 24.183c-2.958 1.29-.442 7.41 1.42 7.383a30.842 30.842 0 0 1-1.42-7.383zM43.507 24.182c2.96 1.292.443 7.411-1.419 7.384a30.832 30.832 0 0 0 1.419-7.384z"/><path fill="#ffe8be" fillRule="evenodd" d="M31.114 8.666c8.722 0 12.377 6.2 12.601 13.367.307 9.81-5.675 21.43-12.6 21.43-6.56 0-12.706-12.018-12.333-21.928.26-6.953 3.814-12.869 12.332-12.869z"/><path fill="#464449" fillRule="evenodd" d="M33.399 24.983a7.536 7.536 0 0 1 5.223-.993h.005c5.154.63 5.234 2.232 4.733 2.601a2.885 2.885 0 0 0-.785 1.022 6.566 6.566 0 0 1-1.052 2.922 5.175 5.175 0 0 1-3.464 2.312c-.168.027-.34.048-.516.058a4.345 4.345 0 0 1-3.65-1.554 8.33 8.33 0 0 1-1.478-2.53v.003s-.797-1.636-2.072-.114a8.446 8.446 0 0 1-1.52 2.64 4.347 4.347 0 0 1-3.651 1.555 5.242 5.242 0 0 1-.516-.058 5.176 5.176 0 0 1-3.464-2.312 6.568 6.568 0 0 1-1.052-2.921 2.75 2.75 0 0 0-.77-1.023c-.5-.37-.425-1.973 4.729-2.603a7.545 7.545 0 0 1 5.24 1.01l.003.002.215.131a3.93 3.93 0 0 0 3.842-.148zm-4.672.638a6.638 6.638 0 0 0-6.157-.253c-1.511.686-1.972 1.17-1.386 3.163a5.617 5.617 0 0 0 .712 1.532 4.204 4.204 0 0 0 3.326 1.995 3.536 3.536 0 0 0 2.966-1.272 7.597 7.597 0 0 0 1.36-2.37c.679-1.78.862-1.863-.82-2.795zm10.947-.45a6.727 6.727 0 0 0-5.886.565c-1.538.911-1.258 1.063-.578 2.79a7.476 7.476 0 0 0 1.316 2.26 3.536 3.536 0 0 0 2.967 1.272 4.228 4.228 0 0 0 .43-.048 4.34 4.34 0 0 0 2.896-1.947 5.593 5.593 0 0 0 .684-1.44c.702-2.25.076-2.751-1.828-3.451z"/><path fill="#8a5c42" fillRule="evenodd" d="M17.89 25.608c0-.638.984-.886 1.598 2.943a22.164 22.164 0 0 0 .956-4.813c1.162.225 2.278 2.848 1.927 5.148 3.166-.777 11.303-5.687 13.949-12.324 6.772 3.901 6.735 12.094 6.735 12.094s.358-1.9.558-3.516c.066-.538.293-.733.798-.213C48.073 17.343 42.3 5.75 31.297 5.57c-15.108-.246-17.03 16.114-13.406 20.039z"/><path fill="#fff" fillRule="evenodd" d="M24.765 42.431a14.125 14.125 0 0 0 6.463 5.236l-4.208 6.144-5.917-9.78z"/><path fill="#fff" fillRule="evenodd" d="M37.682 42.431a14.126 14.126 0 0 1-6.463 5.236l4.209 6.144 5.953-9.668z"/><circle cx="31.223" cy="52.562" r=".839" fill="#434955"/><circle cx="31.223" cy="56.291" r=".839" fill="#434955"/><path fill="#464449" fillRule="evenodd" d="M41.997 24.737c1.784.712 1.719 1.581 1.367 1.841a2.886 2.886 0 0 0-.785 1.022 6.618 6.618 0 0 1-.582 2.086v-4.949zm-21.469 4.479a6.619 6.619 0 0 1-.384-1.615 2.748 2.748 0 0 0-.77-1.023c-.337-.249-.413-1.06 1.154-1.754z"/></svg>;
const AvatarTwo = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#a9cf54"/><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z"/><path fill="#302e33" fillRule="evenodd" d="M16.647 25.104s1.394 18.62-1.98 23.645 16.51-.19 16.51-.19l.006-34.863z"/><path fill="#302e33" fillRule="evenodd" d="M45.705 25.104s-1.394 18.62 1.981 23.645-16.51-.19-16.51-.19l-.006-34.863z"/><path fill="#f9dca4" fillRule="evenodd" d="M52.797 52.701c-.608-1.462-.494-2.918-5.365-5.187-2.293-.542-8.21-1.319-9.328-3.4-.567-1.052-.43-2.535-.43-5.292l-12.93-.142c0 2.777.109 4.258-.524 5.298-1.19 1.957-8.935 3.384-11.338 4.024-4.093 1.819-3.625 2.925-4.165 4.406a30.896 30.896 0 0 0 44.08.293z"/><path fillRule="evenodd" opacity=".11" d="m37.677 38.778-.015 2.501a5.752 5.752 0 0 0 .55 3.011c-4.452 3.42-12.794 2.595-13.716-5.937z"/><path fill="#f9dca4" fillRule="evenodd" d="M19.11 24.183c-2.958 1.29-.442 7.41 1.42 7.383a30.842 30.842 0 0 1-1.42-7.383zM43.507 24.182c2.96 1.292.443 7.411-1.419 7.384a30.832 30.832 0 0 0 1.419-7.384z"/><path fill="#ffe8be" fillRule="evenodd" d="M31.114 8.666c8.722 0 12.377 6.2 12.601 13.367.307 9.81-5.675 21.43-12.6 21.43-6.56 0-12.706-12.018-12.333-21.928.26-6.953 3.814-12.869 12.332-12.869z"/><path fill="#464449" fillRule="evenodd" d="M31.183 13.697c-.579 2.411-3.3 10.167-14.536 11.407C15.477 5.782 30.182 6.256 31.183 6.311c1.002-.055 15.707-.53 14.536 18.793-11.235-1.24-13.957-8.996-14.536-11.407z"/><path fill="#e9573e" fillRule="evenodd" d="M52.797 52.701c-14.87 4.578-34.168 1.815-39.915-4.699-4.093 1.819-3.625 2.925-4.165 4.406a30.896 30.896 0 0 0 44.08.293z"/><path fill="#e9573e" fillRule="evenodd" d="m42.797 46.518 1.071.253-.004 8.118h-1.067v-8.371z"/><path fill="#464449" fillRule="evenodd" d="M23.834 44.42c.002.013.878 4.451 7.544 4.451 6.641 0 7.046-4.306 7.047-4.318l.188.183c0 .012-.564 4.702-7.235 4.702-6.797 0-7.756-4.83-7.759-4.845z"/><ellipse cx="31.324" cy="49.445" rx="1.513" ry="1.909" fill="#464449"/></svg>;
const AvatarThree = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61.8 66.358"><defs><clipPath id="clip-path-a3"><path fill="none" d="M53.456 52.022A30.766 30.766 0 0 1 30.9 61.829a31.163 31.163 0 0 1-3.833-.237 34.01 34.01 0 0 1-11.15-3.644 31.007 31.007 0 0 1-7.849-6.225l1.282-3.1 13.91-6.212c.625 3.723 7.806 8.175 7.806 8.175s7.213-3.412 8.087-8.211l12.777 6.281z" clipRule="evenodd"></path></clipPath><clipPath id="clip-path-2-a3"><path fill="none" d="M14.112 46.496l6.814-3.042 10.209 13.978 10.328-13.938 5.949 2.831v20.033h-33.3V46.496z" clipRule="evenodd"></path></clipPath></defs><g><g><circle cx="30.9" cy="30.9" r="30.9" fill="#3dbc93"></circle><path fill="#f9dca4" fillRule="evenodd" d="M23.255 38.68l15.907.121v12.918l-15.907-.121V38.68z"></path><path fillRule="evenodd" d="M39.165 38.778v3.58a7.783 7.783 0 0 1-.098 1.18 6.527 6.527 0 0 1-.395 1.405c-5.374 4.164-13.939.748-15.306-6.365z" opacity=".11"></path><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z"></path><path fill="#f9dca4" fillRule="evenodd" d="M18.365 24.046c-3.07 1.339-.46 7.686 1.472 7.658a31.972 31.972 0 0 1-1.472-7.659zM44.135 24.046c3.07 1.339.465 7.686-1.466 7.657a31.978 31.978 0 0 0 1.466-7.657z"></path><path fill="#ecbe6a" fillRule="evenodd" d="M44.123 24.17s7.96-11.785-2.636-16.334a11.881 11.881 0 0 0-12.87-5.22C22.775 3.805 20.604 6.7 20.604 6.7s-5.53 5.014-10.44 5.117a9.774 9.774 0 0 0 6.28 1.758c-.672 1.68-1.965 7.21 1.989 10.854 4.368-2.868 8.012-8.477 8.012-8.477s.982 3.257.207 4.86a18.879 18.879 0 0 0 7.922-3.531c2.542-2.036 3.893-4.297 5.31-4.326 3.256-.069 4.213 9.74 4.24 11.216z"></path><path fill="#498bd9" fillRule="evenodd" d="M53.456 52.022A30.766 30.766 0 0 1 30.9 61.829a31.163 31.163 0 0 1-3.833-.237 34.01 34.01 0 0 1-11.15-3.644 31.007 31.007 0 0 1-7.849-6.225l1.282-3.1 13.91-6.212c.625 3.723 7.806 8.175 7.806 8.175s7.213-3.412 8.087-8.211l12.777 6.281z"></path><g clipPath="url(#clip-path-a3)"><path fill="#545f69" fillRule="evenodd" d="M14.112 46.496l6.814-3.042 10.209 13.978 10.328-13.938 5.949 2.831v20.033h-33.3V46.496z"></path><g clipPath="url(#clip-path-2-a3)"><path fill="#434955" fillRule="evenodd" d="M37.79 42.881h.732v21.382h-.732V42.881zm-14.775 0h.731v21.382h-.73V42.881zm-2.981 0h.731v21.382h-.731V42.881zm-2.944 0h.731v21.382h-.73V42.881zm-2.981 0h.731v21.382h-.731V42.881zm20.708 0h.731v21.382h-.731V42.881zm-2.981 0h.731v21.382h-.731V42.881zm-2.944 0h.731v21.382h-.731V42.881zm-2.981 0h.731v21.382h-.731V42.881zm20.785 0h.732v21.382h-.732V42.881zm-2.98 0h.73v21.382h-.73V42.881zm-2.944 0h.73v21.382h-.73z"></path></g></g><path fill="#58b0e0" fillRule="evenodd" d="m23.265 41.27 7.802 9.316-6.305 3.553-4.823-10.591 3.326-2.278zM39.155 41.45l-8.088 9.136 6.518 3.553 4.777-10.719-3.207-1.97z"></path><path fill="#464449" fillRule="evenodd" d="M21.637 23.157h6.416a1.58 1.58 0 0 1 1.119.464v.002a1.579 1.579 0 0 1 .464 1.117v2.893a1.585 1.585 0 0 1-1.583 1.583h-6.416a1.578 1.578 0 0 1-1.116-.465h-.002a1.58 1.58 0 0 1-.464-1.118V24.74a1.579 1.579 0 0 1 .464-1.117l.002-.002a1.578 1.578 0 0 1 1.116-.464zm6.416.85h-6.416a.735.735 0 0 0-.517.214l-.001.002a.735.735 0 0 0-.214.517v2.893a.73.73 0 0 0 .215.517.735.735 0 0 0 .517.215h6.416a.735.735 0 0 0 .732-.732V24.74a.734.734 0 0 0-.214-.518.731.731 0 0 0-.518-.215zM34.548 23.157h6.416a1.58 1.58 0 0 1 1.118.464v.002a1.579 1.579 0 0 1 .465 1.117v2.893a1.585 1.585 0 0 1-1.583 1.583h-6.416a1.58 1.58 0 0 1-1.117-.465l-.001-.002a1.58 1.58 0 0 1-.465-1.116V24.74a1.58 1.58 0 0 1 .465-1.117l.002-.001a1.58 1.58 0 0 1 1.116-.465zm6.416.85h-6.416a.73.73 0 0 0-.517.214l-.001.002a.729.729 0 0 0-.214.517v2.893a.73.73 0 0 0 .214.517l.001.001a.73.73 0 0 0 .517.214h6.416a.735.735 0 0 0 .732-.732V24.74a.734.734 0 0 0-.214-.518h-.001a.731.731 0 0 0-.517-.215z"></path><path fill="#464449" d="M29.415 24.506h3.845v.876h-3.845z"></path></g></g></svg>;
const AvatarFour = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61.8 61.8"><g><g><circle cx="30.9" cy="30.9" r="30.9" fill="#485a69"></circle><path fill="#f9dca4" fillRule="evenodd" d="M23.242 38.592l15.92.209v12.918l-15.907-.121-.013-13.006z"></path><path fill="#d5e1ed" fillRule="evenodd" d="M53.478 51.993A30.814 30.814 0 0 1 30.9 61.8a31.225 31.225 0 0 1-3.837-.237A30.699 30.699 0 0 1 15.9 57.919a31.033 31.033 0 0 1-7.857-6.225l1.284-3.1 13.925-6.212c0 4.535 1.84 6.152 7.97 6.244 7.57.113 7.94-1.606 7.94-6.28l12.79 6.281z"></path><path fillRule="evenodd" d="M39.165 38.778v3.404c-2.75 4.914-14 4.998-15.923-3.59z" opacity=".11"></path><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.267 0-21.281-35.266 0-35.266z"></path><path fill="#f9dca4" fillRule="evenodd" d="M18.365 24.045c-3.07 1.34-.46 7.687 1.472 7.658a31.973 31.973 0 0 1-1.472-7.658zM44.14 24.045c3.07 1.339.46 7.687-1.471 7.658a31.992 31.992 0 0 0 1.471-7.658z"></path><path fill="#ecbe6a" fillRule="evenodd" d="M43.409 29.584s1.066-8.716-2.015-11.752c-1.34 3.528-7.502 4.733-7.502 4.733a16.62 16.62 0 0 0 3.215-2.947c-1.652.715-6.876 2.858-11.61 1.161a23.715 23.715 0 0 0 3.617-2.679s-4.287 2.322-8.44 1.742c-2.991 2.232-1.66 9.162-1.66 9.162C15 18.417 18.697 6.296 31.39 6.226c12.358-.069 16.17 11.847 12.018 23.358z"></path><path fill="#fff" fillRule="evenodd" d="M23.255 42.179a17.39 17.39 0 0 0 7.958 6.446l-5.182 5.349L19.44 43.87z"></path><path fill="#fff" fillRule="evenodd" d="M39.16 42.179a17.391 17.391 0 0 1-7.958 6.446l5.181 5.349 6.592-10.103z"></path><path fill="#3dbc93" fillRule="evenodd" d="M33.366 61.7q-1.239.097-2.504.098-.954 0-1.895-.056l1.031-8.757h2.41z"></path><path fill="#3dbc93" fillRule="evenodd" d="M28.472 51.456l2.737-2.817 2.736 2.817-2.736 2.817-2.737-2.817z"></path></g></g></svg>;
const AvatarFive = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#e9573e"/><path fill="#f9dca4" fillRule="evenodd" d="M23.255 38.68l15.907.149v3.617l7.002 3.339-15.687 14.719-13.461-15.34 6.239-2.656V38.68z"/><path fill="#677079" fillRule="evenodd" d="M53.478 51.993A30.813 30.813 0 0 1 30.9 61.8a31.226 31.226 0 0 1-3.837-.237A34.071 34.071 0 0 1 15.9 57.919a31.034 31.034 0 0 1-7.856-6.225l1.283-3.1 11.328-5.054c.875 4.536 4.235 11.535 10.176 15.502a24.128 24.128 0 0 0 11.057-15.318l10.063 4.903z"/><path fillRule="evenodd" opacity=".11" d="M39.791 42.745c.728.347 1.973.928 2.094.999-2.03 6.368-15.72 8.7-19.756-.756z"/><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z"/><path fill="#f9dca4" fillRule="evenodd" d="M18.365 24.045c-3.07 1.34-.46 7.687 1.472 7.658a31.974 31.974 0 0 1-1.472-7.658zM44.14 24.045c3.07 1.339.46 7.687-1.471 7.658a31.993 31.993 0 0 0 1.471-7.658z"/><path fill="#ad835f" fillRule="evenodd" d="M23.396 15.437c-.592 2.768-.384 5.52-3.008 6.028-.624.12-1.037.965-1.172 1.71a22.896 22.896 0 0 0-.38 4.931c.104.569-.396-1.092-.396-1.092l-.085-3.174s-.037-.608-.023-1.535c.03-1.88.244-4.928 1.196-5.86 1.421-1.39 3.868-1.008 3.868-1.008zM39.095 15.437c.592 2.768.385 5.52 3.008 6.028.624.12 1.038.965 1.172 1.71a21.808 21.808 0 0 1 .312 4.947c-.105.57.395-1.092.395-1.092l.166-3.178s.025-.62.01-1.547c-.028-1.88-.242-4.928-1.195-5.86-1.421-1.39-3.868-1.008-3.868-1.008z"/><path fill="#60350a" fillRule="evenodd" d="M25.364 46.477c-1.51-1.457-2.718-2.587-3.814-3.718-1.405-1.451-1.881-2.922-2.154-5.498a110.846 110.846 0 0 1-1.043-13.43s1.034 6.333 2.962 9.455c.99 1.603 5.04-2.165 6.655-2.738a2.683 2.683 0 0 1 3.24.782 2.636 2.636 0 0 1 3.213-.782c1.616.573 5.61 3.792 6.656 2.738 2.515-2.536 3.057-9.446 3.057-9.446a113.885 113.885 0 0 1-1.129 13.576c-.363 2.746-.547 3.81-1.486 4.884a30.775 30.775 0 0 1-4.57 4.193c-.828.656-2.267 1.272-5.933 1.25-3.406-.02-4.803-.446-5.654-1.267zM39.604 15.997a2.638 2.638 0 0 1 2.76 1.227c1.556 2.613 1.685 2.95 1.685 2.95s-.184-4.674-.295-5.23a.697.697 0 0 1 .973.028c.11.222-.444-4.7-3.335-5.644-1.057-3.002-4.754-5.226-4.754-5.226l-.167 1.668a6.056 6.056 0 0 0-5.265-4.145c.667.751.507 1.3.507 1.3a8.152 8.152 0 0 0-3.288-.632c.14.889-.889 1.835-.889 1.835s-.639-.974-3.169-1.307c-.445 1.612-1.28 1.89-2.085 2.641a18.92 18.92 0 0 0-1.861 2.224s.083-1.557.639-2.002c.209-.138-4.716 1.803-2.252 9.036a1.962 1.962 0 0 0-1.945 1.462c1.39.389.815 2.49 1.593 3.852.547-1.58.909-4.658 4.328-3.852 2.448.577 4.798 1.814 7.62 1.913 3.987.139 5.501-1.954 9.2-2.098z"/><path fill="#ffe8be" fillRule="evenodd" d="M32.415 38.594a2.774 2.774 0 0 0 2.214-.588c.72-.83 1.307-2.009.215-2.643a8.583 8.583 0 0 0-3.581-1.472 8.595 8.595 0 0 0-3.604 1.47c-1.34.775-.52 1.815.201 2.645a2.774 2.774 0 0 0 2.214.588c-.811-2.824 3.153-2.824 2.341 0z"/></svg>;
const AvatarSix = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#58b0e0"/><path fill="#f9dca4" fillRule="evenodd" d="m23.255 38.68 15.907.121v12.918l-15.907-.121V38.68z"/><path fill="#e6e6e6" fillRule="evenodd" d="M43.971 58.905a30.967 30.967 0 0 1-25.843.14V48.417H43.97z"/><path fill="#e9573e" fillRule="evenodd" d="m33.403 61.7-1.238.099q-1.265.1-2.503.1-.955 0-1.895-.057l1.03-8.988h2.41z"/><path fill="#677079" fillRule="evenodd" d="M25.657 61.332A34.072 34.072 0 0 1 15.9 57.92a31.033 31.033 0 0 1-7.857-6.225l1.284-3.1 13.925-6.212c0 5.212 1.711 13.482 2.405 18.95z"/><path fillRule="evenodd" opacity=".11" d="M39.165 38.759v3.231c-4.732 5.527-13.773 4.745-15.8-3.412z"/><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.267 0-21.281-35.266 0-35.266z"/><path fill="#f9dca4" fillRule="evenodd" d="M18.365 24.046c-3.07 1.339-.46 7.686 1.472 7.658a31.972 31.972 0 0 1-1.472-7.659zM44.14 24.045c3.07 1.339.46 7.687-1.471 7.658a31.993 31.993 0 0 0 1.471-7.658z"/><path fill="#464449" fillRule="evenodd" d="M21.931 14.328c-3.334 3.458-2.161 13.03-2.161 13.03l-1.05-.495c-6.554-25.394 31.634-25.395 25.043 0l-1.05.495s1.174-9.572-2.16-13.03c-4.119 3.995-14.526 3.974-18.622 0z"/><path fill="#677079" fillRule="evenodd" d="M36.767 61.243a30.863 30.863 0 0 0 17.408-10.018l-1.09-2.631-13.924-6.212c0 5.212-1.7 13.393-2.394 18.861z"/><path fill="#fff" fillRule="evenodd" d="m39.162 41.98-7.926 6.465 6.573 5.913s1.752-9.704 1.353-12.378z"/><path fill="#fff" fillRule="evenodd" d="m23.253 41.98 7.989 6.465-6.645 5.913s-1.746-9.704-1.344-12.378z"/><path fill="#e9573e" fillRule="evenodd" d="m28.109 51.227 3.137-2.818 3.137 2.818-3.137 2.817-3.137-2.817z"/><path fill="#434955" fillRule="evenodd" d="M25.767 61.373a30.815 30.815 0 0 1-3.779-.88 2.652 2.652 0 0 1-.114-.093l-3.535-6.39 4.541-3.26h-4.752l1.017-6.851 4.11-2.599c.178 7.37 1.759 15.656 2.512 20.073zM36.645 61.266c.588-.098 1.17-.234 1.747-.384a56.83 56.83 0 0 0 2.034-.579l.134-.043 3.511-6.315-4.541-3.242h4.752l-1.017-6.817-4.11-2.586c-.178 7.332-1.758 15.571-2.51 19.966z"/></svg>;
const AvatarSeven = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#ffc200"/><path fill="#677079" fillRule="evenodd" d="M52.587 52.908a30.895 30.895 0 0 1-43.667-.291 9.206 9.206 0 0 1 4.037-4.832 19.799 19.799 0 0 1 4.075-2.322c-2.198-7.553 3.777-11.266 6.063-12.335 0 3.487 3.265 1.173 7.317 1.217 3.336.037 9.933 3.395 9.933-1.035 3.67 1.086 7.67 8.08 4.917 12.377a17.604 17.604 0 0 1 3.181 2.002 10.192 10.192 0 0 1 4.144 5.22z"/><path fill="#f9dca4" fillRule="evenodd" d="m24.032 38.68 14.92.09v3.437l-.007.053a2.784 2.784 0 0 1-.07.462l-.05.341-.03.071c-.966 5.074-5.193 7.035-7.803 8.401-2.75-1.498-6.638-4.197-6.947-8.972l-.013-.059v-.2a8.897 8.897 0 0 1-.004-.207c0 .036.003.07.004.106z"/><path fillRule="evenodd" opacity=".11" d="M38.953 38.617v4.005a7.167 7.167 0 0 1-.095 1.108 6.01 6.01 0 0 1-.38 1.321c-5.184 3.915-13.444.704-14.763-5.983z"/><path fill="#f9dca4" fillRule="evenodd" d="M18.104 25.235c-4.94 1.27-.74 7.29 2.367 7.264a19.805 19.805 0 0 1-2.367-7.264zM43.837 25.235c4.94 1.27.74 7.29-2.368 7.263a19.8 19.8 0 0 0 2.368-7.263z"/><path fill="#ffe8be" fillRule="evenodd" d="M30.733 11.361c20.523 0 12.525 32.446 0 32.446-11.83 0-20.523-32.446 0-32.446z"/><path fill="#8a5c42" fillRule="evenodd" d="M21.047 22.105a1.738 1.738 0 0 1-.414 2.676c-1.45 1.193-1.503 5.353-1.503 5.353-.56-.556-.547-3.534-1.761-5.255s-2.032-13.763 4.757-18.142a4.266 4.266 0 0 0-.933 3.6s4.716-6.763 12.54-6.568a5.029 5.029 0 0 0-2.487 3.26s6.84-2.822 12.54.535a13.576 13.576 0 0 0-4.145 1.947c2.768.076 5.443.59 7.46 2.384a3.412 3.412 0 0 0-2.176 4.38c.856 3.503.936 6.762.107 8.514-.829 1.752-1.22.621-1.739 4.295a1.609 1.609 0 0 1-.77 1.214c-.02.266.382-3.756-.655-4.827-1.036-1.07-.385-2.385.029-3.163 2.89-5.427-5.765-7.886-10.496-7.88-4.103.005-14 1.87-10.354 7.677z"/><path fill="#434955" fillRule="evenodd" d="M19.79 49.162c.03.038 10.418 13.483 22.63-.2-1.475 4.052-7.837 7.27-11.476 7.26-6.95-.02-10.796-5.6-11.154-7.06z"/><path fill="#e6e6e6" fillRule="evenodd" d="M36.336 61.323c-.41.072-.822.135-1.237.192v-8.937a.576.576 0 0 1 .618-.516.576.576 0 0 1 .619.516v8.745zm-9.82.166q-.622-.089-1.237-.2v-8.711a.576.576 0 0 1 .618-.516.576.576 0 0 1 .62.516z"/></svg>;


const UserAvatar = ({ name, avatarId, size = 'small', style = {} }) => {
    const isLarge = size === 'large';
    const isMedium = size === 'medium';
    const dim = isLarge ? 80 : (isMedium ? 30 : 40); 
    const fontSize = isLarge ? '2.5rem' : (isMedium ? '1rem' : '1.2rem');
    
    // Fallback to 0 if undefined
    const safeId = typeof avatarId === 'number' && avatarId >= 0 && avatarId <= 7 ? avatarId : 0;

    // Base container style
    const containerStyle = {
        width: `${dim}px`, 
        height: `${dim}px`, 
        borderRadius: '50%', 
        overflow: 'hidden', // Ensures SVGs stay within the circle
        backgroundColor: safeId === 0 ? 'var(--brand-color)' : 'transparent',
        color: '#fff', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: fontSize, 
        fontWeight: 600,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        flexShrink: 0,
        ...style
    };

    const renderContent = () => {
        switch(safeId) {
            case 1: return <AvatarOne />;
            case 2: return <AvatarTwo />;
            case 3: return <AvatarThree />;
            case 4: return <AvatarFour />;
            case 5: return <AvatarFive />;
            case 6: return <AvatarSix />;
            case 7: return <AvatarSeven />;
            case 0:
            default: return name ? name.charAt(0).toUpperCase() : 'U';
        }
    };

    return (
        <div style={containerStyle}>
            {renderContent()}
        </div>
    );
};

const UserEditModal = ({ isOpen, isClosing, user, onClose, onSave }) => {
    const isNewUser = !user;
    const [formData, setFormData] = useState({
        userId: '',
        userName: '',
        email: '',
        password: '',
        role: 'USER',
        status: 'Active',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (isNewUser) {
                setFormData({ userId: '', userName: '', email: '', password: '', role: 'USER', status: 'Active' });
            } else {
                setFormData({
                    userId: user.userId,
                    userName: user.userName || '',
                    email: user.email || '',
                    password: '', // Password is for reset only, not displayed
                    role: user.role || 'USER',
                    status: user.status || 'Active',
                });
            }
        }
    }, [isOpen, user, isNewUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
        } catch (e) {
            // Error is handled in the parent component's onSave
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div style={{...styles.modalOverlay, animation: isClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={onClose}>
            <div style={{...styles.modalContent, animation: isClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                <h3 style={{...styles.modalTitle, textAlign: 'center'}}>{isNewUser ? 'Create New User' : 'Edit User'}</h3>
                
                <div style={styles.inputGroup}>
                    <label style={styles.label}>User ID</label>
                    <input type="text" name="userId" value={formData.userId} onChange={handleChange} style={styles.modalInput} disabled={!isNewUser} />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Display Name</label>
                    <input type="text" name="userName" value={formData.userName} onChange={handleChange} style={styles.modalInput} />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} style={styles.modalInput} disabled={!isNewUser} />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Password</label>
                    <input type="text" name="password" value={formData.password} onChange={handleChange} style={styles.modalInput} placeholder={isNewUser ? 'Required' : 'Leave blank to keep unchanged'} />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Role</label>
                    <select name="role" value={formData.role} onChange={handleChange} style={styles.modalSelect}>
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} style={styles.modalSelect}>
                        <option value="Active">Active</option>
                        <option value="Disabled">Disabled</option>
                        <option value="Locked">Locked</option>
                    </select>
                </div>

                <div style={styles.iosModalActions}>
                    <button onClick={onClose} style={styles.iosModalButtonSecondary} disabled={isSaving}>Cancel</button>
                    <button onClick={handleSave} style={styles.iosModalButtonPrimary} disabled={isSaving}>
                        {isSaving ? <SmallSpinner /> : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export const UserManagement = ({ session }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [modalState, setModalState] = useState({ isOpen: false, isClosing: false, user: null });
    const [sendingLoginFor, setSendingLoginFor] = useState(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST', mode: 'cors',
                body: JSON.stringify({ action: 'getUsers', adminRole: session.role }),
            });
            const result = await response.json();
            if (result.success) {
                setUsers(result.users);
            } else {
                setError(result.message || 'Failed to fetch users.');
            }
        } catch (err) {
            setError('An error occurred. Please check your network connection.');
        } finally {
            setIsLoading(false);
        }
    }, [session.role]);

    useEffect(() => {
        if (session.role === 'ADMIN') {
            fetchUsers();
        } else {
            setError('Permission denied. Admin access required.');
            setIsLoading(false);
        }
    }, [fetchUsers, session.role]);

    const handleOpenModal = (user) => {
        setModalState({ isOpen: true, isClosing: false, user });
    };

    const handleCloseModal = () => {
        setModalState(prev => ({ ...prev, isClosing: true }));
        setTimeout(() => setModalState({ isOpen: false, isClosing: false, user: null }), 300);
    };

    const handleSaveUser = async (userData) => {
        const isNewUser = !modalState.user;
        const action = isNewUser ? 'createUser' : 'updateUser';
        
        // FIX: Cast payload to 'any' to allow for dynamic property assignment based on whether it's a new user or an update. This resolves TypeScript errors about properties not existing on the initial object type.
        let payload: any = {
            action,
            adminRole: session.role,
        };

        if(isNewUser) {
            payload.userData = userData;
        } else {
            payload.userIdToUpdate = modalState.user.userId;
            payload.updates = {
                userName: userData.userName,
                role: userData.role,
                status: userData.status,
                password: userData.password || undefined // only send if not blank
            }
        }

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST', mode: 'cors', body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
                handleCloseModal();
                fetchUsers(); // Refresh the list
            } else {
                showToast(result.message, 'error');
            }
        } catch (err) {
            showToast('An error occurred while saving.', 'error');
        }
    };
    
    const handleSendLogin = async (user) => {
        if (!window.confirm(`Are you sure you want to send login details to ${user.userName}?`)) return;

        setSendingLoginFor(user.userId);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST', mode: 'cors',
                body: JSON.stringify({ 
                    action: 'sendLoginDetails', 
                    adminRole: session.role,
                    userIdToSend: user.userId
                }),
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch(e) {
            showToast('Failed to send details.', 'error');
        } finally {
            setSendingLoginFor(null);
        }
    }


    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowercasedTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            (user.userName && user.userName.toLowerCase().includes(lowercasedTerm)) ||
            (user.userId && user.userId.toLowerCase().includes(lowercasedTerm)) ||
            (user.email && user.email.toLowerCase().includes(lowercasedTerm))
        );
    }, [users, searchTerm]);
    
    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (filteredUsers.length === 0) return <div style={styles.centeredMessage}>No users found.</div>;

        return (
            <div style={styles.listContainer}>
                {filteredUsers.map(user => (
                    <div key={user.userId} style={styles.userCard}>
                        <UserAvatar name={user.userName} avatarId={user.avatarId} />
                        <div style={styles.userInfo}>
                            <div style={styles.userName}>{user.userName}</div>
                            <div style={styles.userRole}>{user.role}</div>
                            <div style={styles.userMeta}>
                                <span style={styles.userIdText}>ID: {user.userId}</span>
                                <span style={styles.userMeta}>• {user.email || 'No email'}</span>
                            </div>
                        </div>
                        <div style={styles.userActions}>
                             {session.userId !== user.userId && (
                                <>
                                    <button style={styles.actionButton} onClick={() => handleSendLogin(user)} disabled={sendingLoginFor === user.userId}>
                                        {sendingLoginFor === user.userId ? <SmallSpinner /> : <MailIcon />}
                                    </button>
                                    <button style={styles.actionButton} onClick={() => handleOpenModal(user)}><EditIcon /></button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerCard}>
                 <div style={styles.headerTop}>
                    <h2 style={styles.pageTitle}>User Management</h2>
                    <button style={styles.newUserButton} onClick={() => handleOpenModal(null)}>
                        <PlusIcon/> New User
                    </button>
                </div>
                <div style={isSearchFocused ? {...styles.searchContainer, ...styles.searchContainerActive} : styles.searchContainer}>
                    <SearchIcon />
                    <input
                        type="text"
                        style={styles.searchInput}
                        className="global-search-input"
                        placeholder="Search by name, ID, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                    />
                </div>
            </div>
            {renderContent()}
            <UserEditModal 
                isOpen={modalState.isOpen}
                isClosing={modalState.isClosing}
                user={modalState.user}
                onClose={handleCloseModal}
                onSave={handleSaveUser}
            />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: 'auto' },
    container: { display: 'flex', flexDirection: 'column', gap: '0', flex: 1 },
    headerCard: {
        backgroundColor: 'transparent',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--border-radius)',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', },
    pageTitle: { display: 'none' },
    newUserButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.2rem',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: 'var(--brand-color)',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    searchContainer: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 12px',
        backgroundColor: 'var(--card-bg)', 
        padding: '11px', 
        borderRadius: '20px',
        border: '1px solid transparent',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    searchContainerActive: { borderColor: 'var(--brand-color)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1rem 1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    userCard: {
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--border-radius)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    userInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    userName: { fontWeight: 600, fontSize: '1.1rem', color: 'var(--dark-grey)' },
    userRole: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-color)', backgroundColor: 'var(--active-bg)', padding: '2px 8px', borderRadius: '12px', alignSelf: 'flex-start' },
    userMeta: { fontSize: '0.9rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' },
    userIdText: { backgroundColor: 'var(--light-grey)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' },
    userActions: { display: 'flex', gap: '0.5rem' },
    actionButton: { background: 'var(--light-grey)', border: '1px solid var(--separator-color)', color: 'var(--dark-grey)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s, color 0.2s', },
    
    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 },
    modalContent: { backgroundColor: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem', transform: 'scale(0.95)', opacity: 0 },
    modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalInput: { width: '100%', padding: '10px 15px', fontSize: '1rem', border: '1px solid var(--separator-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)' },
    modalSelect: { width: '100%', padding: '10px 15px', fontSize: '1rem', border: '1px solid var(--separator-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)' },
    iosModalActions: { display: 'flex', width: 'calc(100% + 3rem)', marginLeft: '-1.5rem', marginBottom: '-1.5rem', borderTop: '1px solid var(--glass-border)', marginTop: '1.5rem' },
    iosModalButtonSecondary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--dark-grey)', borderRight: '1px solid var(--glass-border)', fontWeight: 400 },
    iosModalButtonPrimary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--brand-color)', fontWeight: 600 },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    label: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-color)' },
};

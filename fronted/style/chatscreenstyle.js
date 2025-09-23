//聊天頁面的UI的style檔案
import { StyleSheet } from 'react-native';

export const styles=StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: '#efe2d8',
    marginTop: 40,
  },
  inner: { 
   flex: 1,
  },
  header: { // 標題區
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 60,
    borderBottomWidth: 1,
    borderColor: '#796c66',
    backgroundColor: '#efe2d8',
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1, // 確保在最上層
    backgroundColor: '#494541',
    borderRadius: 15,
    padding: 6,
    shadowColor: '#664a2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3, // Android 陰影
  },
  backButtonText: {
    fontSize: 16,
    color: '#fcf7ef',
  },
  chatContainer: { // 聊天訊息的容器
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  messageRow: { 
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  messageRight: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  avatar: { // 頭像樣式
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 6,
  },
  bubble: { // 訊息泡泡樣式
    maxWidth: '70%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#d6c6b8',
    borderTopRightRadius: 0,
  },
  botBubble: {
    backgroundColor: '#f8f4f0',
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  
inputWrapper: {
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
inputContainer: { // 底部輸入區樣式
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#796c66',
    gap: 10,
    //marginBottom:40,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#796c66',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 16,
  },
  sendButton: {
    padding: 6,
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: '100%',
    left:30,
    right:30,
    flexDirection: 'row',
    backgroundColor: '#8b6d5c',
    borderRadius: 6,
    overflow: 'hidden',
    zIndex: 1000,
  },
  floatingButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDivider: { //分隔線
    width: 1,
    backgroundColor: '#ab856f',
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  replyContainer: {
  flexDirection: 'row',          // 水平排列：左邊線條 + 右邊回覆內容
  alignItems: 'center',          // 垂直置中
  marginBottom: 6,               // 與主要訊息間距
  paddingVertical: 4,            // 垂直內距讓回覆區更明顯
  paddingHorizontal: 8,          // 水平內距
  backgroundColor: '#f0f0f0',   // 淺灰背景，和主訊息做區隔
  borderRadius: 8,               // 圓角
},
replyLine: {
  width: 3,                     // 線條寬度
  height: '100%',               // 滿高撐滿容器
  backgroundColor: '#4a90e2',  // 藍色線條，讓回覆更明顯
  borderRadius: 2,              // 線條圓角
  marginRight: 8,               // 線條和回覆內容間距
},
replyText: {
  flexShrink: 1,               // 超出文字會截斷，不會撐破容器
  fontSize: 14,                // 字體稍微小一點
  color: '#666',               // 深灰色文字，看起來不像主訊息
},
replyPreview: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f0f0f0',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderColor: '#ddd',
},

replyPreviewBar: {
  width: 4,
  height: '100%',
  backgroundColor: '#999',
  marginRight: 8,
  borderRadius: 2,
},

replyPreviewText: {
  fontSize: 14,
  color: '#333',
},

modalbackground: {
  flex: 1, 
  justifyContent: 'center', 
  alignItems: 'center', 
  backgroundColor: '#00000099',
},

modalinfo: {
  backgroundColor: '#fff', 
  padding: 20, 
  borderRadius: 10,
  width: '70%',
},

modaltitle: {
  fontSize: 16, 
  fontWeight: 'bold', 
  marginBottom: 10,
},

});

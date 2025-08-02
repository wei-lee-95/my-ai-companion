//創建人物主頁面的UI的style檔案
import { StyleSheet } from 'react-native';

export const styles=StyleSheet.create({
    scrollContent: {
        padding: 24,
        alignItems: 'center',
    },
    titleContainer: {
        marginBottom: 32,
        backgroundColor: '#efe2d8',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        top: 24,
        left: 24,
        //zIndex: 1, // 確保在最上層
        backgroundColor: '#000',
        borderRadius: 15,
        padding: 6,
        shadowColor: '#664a2e',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3, // Android 陰影
    },
    backButtonText: {
        fontSize: 18,
        color: '#fcf7ef',
    },
    SettingButton: {
        width: '80%',
        height: 150,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 2,  
        borderColor: '#8b6d5c',
        borderStyle: 'dashed'
    },
    plus: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#d6c6b8',
    },
    buttonText: {
        fontSize: 16,
        marginTop: 8,
        color: '#b5a292',
    },
    audioInfo: {
        width: '80%',
        alignItems: 'center',
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    playButton: {
        width: 35,
        height: 35,
        borderRadius: 10,
        backgroundColor: '#333',
        alignItems: 'center',
        marginRight: 10,
    },
    playButtonText: {
        color: '#fff',
        fontSize: 25,
        lineHeight: 25,
        textAlign: 'center',
    },
    audioFileName: {
        fontSize: 20,
        color: '#333',
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
        marginBottom: 24,
    },
    inputField: {
        flex: 1,
        height: 48,
        marginHorizontal: 4,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#a97c50',
        fontSize: 16,
        color: '#fff',
        textAlign: 'center'
    },
    checkboxSection: {
        width: '80%',
        //height: 150,
        marginBottom: 24,
    },
    freeTraitInput: {
        width: '100%',
        minHeight: 150,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
        textAlignVertical: 'top',
        //shadowColor: '#000',
        //shadowOffset: { width: 0, height: 1 },
        //shadowOpacity: 0.1,
        //shadowRadius: 2,
        //elevation: 2, // Android陰影
    },
    confirmButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#a97c50',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom:20,
    },
    confirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

});
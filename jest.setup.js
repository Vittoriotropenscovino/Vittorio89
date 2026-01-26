// Jest setup file

// Mock expo modules
jest.mock('expo-file-system', () => ({
    documentDirectory: 'file://test/',
    getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
    copyAsync: jest.fn().mockResolvedValue(undefined),
    deleteAsync: jest.fn().mockResolvedValue(undefined),
    readDirectoryAsync: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
    MediaTypeOptions: { All: 'All', Images: 'Images', Videos: 'Videos' },
}));

jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getCurrentPositionAsync: jest.fn().mockResolvedValue({
        coords: { latitude: 41.9028, longitude: 12.4964 },
    }),
}));

jest.mock('expo-screen-orientation', () => ({
    lockAsync: jest.fn().mockResolvedValue(undefined),
    OrientationLock: { LANDSCAPE: 'LANDSCAPE' },
}));

jest.mock('expo-updates', () => ({
    reloadAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-blur', () => ({
    BlurView: 'BlurView',
}));

jest.mock('expo-av', () => ({
    Video: 'Video',
    ResizeMode: { CONTAIN: 'contain' },
}));

jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: jest.fn().mockImplementation((uri) => Promise.resolve({ uri })),
    SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@sentry/react-native', () => ({
    init: jest.fn(),
    wrap: (component) => component,
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    addBreadcrumb: jest.fn(),
    setTag: jest.fn(),
    withScope: jest.fn((callback) => callback({ setExtra: jest.fn() })),
    reactNativeTracingIntegration: jest.fn(),
}));

// Mock Three.js and react-three
jest.mock('three', () => {
    const THREE = jest.requireActual('three');
    return {
        ...THREE,
        TextureLoader: jest.fn().mockImplementation(() => ({
            load: jest.fn((url, onLoad) => {
                const texture = new THREE.Texture();
                if (onLoad) onLoad(texture);
                return texture;
            }),
        })),
    };
});

jest.mock('@react-three/fiber', () => ({
    Canvas: ({ children }) => children,
    useFrame: jest.fn(),
    useThree: () => ({
        camera: { position: { length: () => 5 } },
    }),
}));

jest.mock('@react-three/drei', () => ({
    Stars: () => null,
    OrbitControls: () => null,
    useTexture: () => [null, null, null, null],
}));

// Silence console warnings in tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};

// Mock fetch for geocoding
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            {
                lat: '41.9028',
                lon: '12.4964',
                display_name: 'Roma, Lazio, Italia',
                place_id: 123456,
            },
        ]),
    })
);

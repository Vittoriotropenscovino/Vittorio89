import logger from '../src/utils/logger';

describe('Logger', () => {
    let consoleSpy: {
        log: jest.SpyInstance;
        warn: jest.SpyInstance;
        error: jest.SpyInstance;
    };

    beforeEach(() => {
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation(),
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('in development mode', () => {
        it('should log debug messages', () => {
            logger.debug('test debug message');

            expect(consoleSpy.log).toHaveBeenCalledWith(
                '[DEBUG]',
                'test debug message'
            );
        });

        it('should log info messages', () => {
            logger.info('test info message');

            expect(consoleSpy.log).toHaveBeenCalledWith(
                '[INFO]',
                'test info message'
            );
        });

        it('should log warning messages', () => {
            logger.warn('test warning message');

            expect(consoleSpy.warn).toHaveBeenCalledWith(
                '[WARN]',
                'test warning message'
            );
        });

        it('should log error messages', () => {
            logger.error('test error message');

            expect(consoleSpy.error).toHaveBeenCalledWith(
                '[ERROR]',
                'test error message'
            );
        });

        it('should handle multiple arguments', () => {
            const testObject = { key: 'value' };
            logger.info('message', testObject, 123);

            expect(consoleSpy.log).toHaveBeenCalledWith(
                '[INFO]',
                'message',
                testObject,
                123
            );
        });
    });
});

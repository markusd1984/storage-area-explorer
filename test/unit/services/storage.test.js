describe("Test storage", function () {
    var delegateStorageMock;
    var evalServiceMock;
    var runtimeMock;
    var appContextMock;
    var _storage;
    var q;
    var rootScope;
    var usedPort;
    beforeEach(module("storageExplorer"));

    beforeEach(function () {
        delegateStorageMock = jasmine.createSpy("delegateStorageMock").andCallFake(function (promise, type) {
            delegateStorageMock.promise = promise;
            if (delegateStorageMock.types === undefined) {
                delegateStorageMock.types = [];
            }
            delegateStorageMock.types.push(type);
            return {};
        });
        appContextMock = jasmine.createSpy("appContextMock").andCallFake(function () {
            var deferred = q.defer();
            deferred.resolve({id: "appId"});
            rootScope.$apply();
            return deferred.promise;
        });
        runtimeMock = {
            onMessageExternal: chrome.mocks.createEvent(),
            connect: jasmine.createSpy("runtime.connect mock").andCallFake(function () {
                usedPort = chrome.mocks.createMockPort();
                spyOn(usedPort.onMessage, 'addListener').andCallThrough();
                return usedPort;
            })
        };
        evalServiceMock = {
            evalFunction: function () {

            }
        }
    });

    beforeEach(module(function ($provide) {
        $provide.value("runtime", runtimeMock);
        $provide.value('delegateStorage', delegateStorageMock);
        $provide.value("evalService", evalServiceMock);
        $provide.value("appContext", appContextMock);
    }));

    beforeEach(function () {
        inject(function ($q, $rootScope) {
            q = $q;
            rootScope = $rootScope;
        });
    });

    beforeEach(inject(function (storage) {
        _storage = storage;
    }));

    it("Should be initialised correctly", function () {
        expect(_storage.local).toBeDefined();
        expect(_storage.sync).toBeDefined();
        expect(appContextMock).toHaveBeenCalled();
        expect(delegateStorageMock).toHaveBeenCalled();
        expect(delegateStorageMock.promise).toBeDefined();
        expect(delegateStorageMock.types.length).toBe(2);
        expect(delegateStorageMock.types.indexOf('local')).toBeGreaterThan(-1);
        expect(delegateStorageMock.types.indexOf('sync')).toBeGreaterThan(-1);
        var callback = jasmine.createSpy("callback").andCallFake(function (connection) {
            expect(connection.remoteId).toBe('appId');
            expect(connection.port).toBe(usedPort);
        });
        delegateStorageMock.promise.then(callback);

        rootScope.$apply();
        expect(runtimeMock.connect).toHaveBeenCalled();
        expect(usedPort.onMessage.addListener).toHaveBeenCalled();
        expect(usedPort).toBeDefined();
        expect(callback).toHaveBeenCalled();
    });

    it("Should spawn angular messages on port messages", function () {
        rootScope.$apply();
        var callback = jasmine.createSpy("callback").andCallFake(function (event,change) {
            expect(change).toBe(obj);
        });
        rootScope.$on("$storageChanged",callback);
        var obj = {change: true};
        usedPort.onMessage({from: 'appId', obj: obj});
        expect(callback).toHaveBeenCalled();
    });

    it("It should react only to certain messages",function(){
        rootScope.$apply();
        var callback = jasmine.createSpy("callback");
        rootScope.$on("$storageChanged",callback);
        usedPort.onMessage({from: 'appId', obj: {}});
        usedPort.onMessage({from: 'badId', obj: {}});

        expect(callback).not.toHaveBeenCalled();
    });

});
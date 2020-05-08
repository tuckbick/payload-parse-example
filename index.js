const Fs = require('fs');
const Hapi = require('@hapi/hapi');

async function processRequest() {
    // some parsing method...
    return Promise.resolve({myfile: 'some-parsed-data'});
}

async function start() {
    const server = Hapi.server({ host: '0.0.0.0', port: 8080 });

    server.ext('onRequest', function(request, h) {
        const contentType = request.headers['content-type'] || '';

        if (contentType.includes('multipart/form-data')
            && request.path === '/dual-endpoint'
            && request.method === 'post') {

            if (!request.payload) {
                request.payload = {};
                request.payload.parse = false;
                request.payload.multipart = true;
            }
        }

        return h.continue;
    });

    server.ext('onPreAuth', async function(request, h) {
        const contentType = request.headers['content-type'] || '';

        if (contentType.includes('multipart/form-data')
            && (request.path === '/upload-endpoint' || request.path === '/dual-endpoint')
            && request.method === 'post') {

            request.pre.payload = await processRequest(request.raw.req);

            if (request.path === '/dual-endpoint' && request.payload.parse === false) {
                request.payload.parse = true;
                request.payload.multipart = false;
            }
        }

        return h.continue;
    });

    server.ext('onPostAuth', function(request, h) {
        if (request.pre.payload) {
            request.payload = request.pre.payload;
        }
        return h.continue;
    });

    server.route([
        {
            path: '/',
            method: 'GET',
            handler: () => Fs.readFileSync('./index.html').toString('utf8')
        },
        {
            path: '/upload-endpoint',
            method: 'POST',
            handler(request, h) {
                console.log('payload', request.payload);
                return h.redirect('/');
            },
            options: {
                payload: {
                    parse: false,
                    multipart: true
                }
            }
        },
        {
            path: '/dual-endpoint',
            method: 'POST',
            handler(request, h) {
                console.log('payload', request.payload);

                return h.redirect('/');
            }
        }
    ]);

    await server.start();
}

start().catch(console.error);
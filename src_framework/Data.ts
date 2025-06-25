namespace iignition {

    export class Data extends DataComponent {
        constructor() {
            super();
        }
       /**
         * Returns Data from a Server URL
         *
         *
         * @param url - The url to fetch
         * @param input - Request parameters
         * @returns A promise with the Data as param
         *  
        */
        fetch(url: RequestInfo, input?: RequestInit ) : Promise<any> {

            iignition.Events.raiseEvent('onDataRequested', input);

            let defaultInput = {method:'GET'};
            input = Object.assign(defaultInput, input) as RequestInit;

            if (!input.method) {
                input.method = 'GET'
            }

            return new Promise((resolve, reject) => {
                
                fetch(url, {
                    method: input.method,
                    headers: input.headers,
                    mode: 'cors',
                    body: input.body

                }).then((response) => {

                    if (response.status === 401) {
                        // Create a specific 401 error object
                        const unauthorizedError = new Error('Unauthorized');
                        (unauthorizedError as any).status = 401;
                        (unauthorizedError as any).url = url;
                        return reject(unauthorizedError);
                    }
                    
                    if (response.status !== 200) return reject();
                    
                    const contentType = response.headers.get("content-type") || "";
                    if (contentType.indexOf("application/json") !== -1) {
                        return response.json();
                    } else if (contentType.indexOf("text/html") !== -1) {
                        return response.text();
                    } else if (contentType.indexOf("application/javascript") !== -1) {
                        return response.text();
                    } else if (contentType.indexOf("text/javascript") !== -1) {
                        return response.text();
                    } else if (contentType.indexOf("application/x-javascript") !== -1) {
                        return response.text();
                    } else if (contentType.indexOf("text/xml") !== -1) {
                        return response.text();
                    } else if (contentType.indexOf("application/xml") !== -1) {
                        return response.text();
                    } else if (contentType.indexOf("text/markdown") !== -1) {
                        return response.text();
                    } else if (contentType.indexOf("image/jpeg") !== -1) {
                        return response.blob();
                    } else if (contentType.indexOf("image/png") !== -1) {
                        return response.blob();
                    } else if (contentType.indexOf("application/pdf") !== -1) {
                        return response.clone();
                    } else {
                        // handle unknown content type
                        return response.text();
                    }
                })
                .then((data) => {
                    resolve(data);
                    Events.raiseEvent('onDataReceived', input);

                })
                .catch((error) => {
                    reject(error);
                })

            });
          
        }

    }
}


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

                    if (response.status !== 200) return reject();
                    
                    var gettype = response.headers.get("Content-Type");

                    if (response.headers.has("content-type")) {

                        if (response.headers.get("content-type").indexOf("application/json") !== -1) {// checking response header
                            return response.json();

                        } else if (response.headers.get("content-type").indexOf("text/html") !== -1) {// checking response header
                            return response.text();
                        } else if (response.headers.get("content-type").indexOf("application/javascript") !== -1) {// checking response header
                            return response.text();
                        } else if (response.headers.get("content-type").indexOf("text/javascript") !== -1) {// checking response header
                            return response.text();
                        } else if (response.headers.get("content-type").indexOf("application/x-javascript") !== -1) {// checking response header
                            return response.text();
                        } else if (response.headers.get("content-type").indexOf("text/xml") !== -1) {// checking response header
                            return response.text();
                        } else if (response.headers.get("content-type").indexOf("application/xml") !== -1) {// checking response header
                            return response.text();
                        } else if (response.headers.get("content-type").indexOf("image/jpeg") !== -1) {// checking response header
                            return response.blob();
                        } else if (response.headers.get("content-type").indexOf("image/png") !== -1) {// checking response header
                            return response.blob();

                        } else if (response.headers.get("Content-Type").indexOf("application/pdf") !== -1) {// checking response header
                            return response.clone()
                        }
                        else {

                            const response = new Response();
                            //throw new TypeError('Response from "' + url + '" has unexpected "content-type"');
                        }
                    }
                    

                })
                .then((data) => {
                    resolve(data);
                    Events.raiseEvent('onDataReceived', input);

                })
                .catch(() => {
                    reject();
                })

            });
          
        }

    }
}

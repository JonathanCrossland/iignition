## Issues

- Splash uses wrong property to splash when using a graph object
```json
    {
    "id": 1,
    "name": "Leanne Graham",
    "username": "Bret",
    "email": "Sincere@april.biz",
    "address": {
        "street": "Kulas Light",
        "suite": "Apt. 556",
        "city": "Gwenborough",
        "zipcode": "92998-3874",
        "geo": {
        "lat": "-37.3159",
        "lng": "81.1496"
        }
    },
    "phone": "1-770-736-8031 x56442",
    "website": "hildegard.org",
    "company": {
        "name": "Romaguera-Crona",
        "catchPhrase": "Multi-layered client-server neural-net",
        "bs": "harness real-time e-markets"
    }
    }
```
In this example i went for data-splash="name" and the field that was splashed is ```company.name``` and not ```name``` on the root object.

## Improvements

- On _preventDoublePosting() add functionality to allow posting again when a field is changed and form might be in an error state. Have to reload at the moment to resolve.
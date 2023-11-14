const timeout = 5000;
let store = $rdf.graph();
let fetcher = new $rdf.Fetcher(store, timeout);
let resolvedIRIs = new Set();
let internalStore = $rdf.graph();
let internalFetcher = new $rdf.Fetcher(internalStore, timeout);
let internalResolvedIRIs = new Set();

function fetchUrl(url, recursive, internal) {
    return new Promise((resolve, reject) => {
        if ((internal ? internalResolvedIRIs : resolvedIRIs).has(url)) {
            resolve();
            return;
        }
        (internal ? internalFetcher : fetcher).load(url, {headers: {'Accept': 'application/rdf+xml'}}).then(body => {
            (internal ? internalResolvedIRIs : resolvedIRIs).add(url);
            let needsRecursiveCall = false;
            if (recursive) {
                for (let statement of (internal ? internalStore : store).statements) {
                    const ownPrefix = url.substring(0, url.indexOf('/openbismantic/') + 15);
                    const o = statement.object;
                    if (o.termType === 'NamedNode' && o.value.startsWith(ownPrefix) && !(internal ? internalResolvedIRIs : resolvedIRIs).has(o.value)) {
                        fetchUrl(o.value, recursive, internal).then(resolve);
                        needsRecursiveCall = true;
                        break;
                    }
                }
            }
            if (!needsRecursiveCall)
                resolve();
            if (!internal) {
                document.getElementById('export-button').removeAttribute('disabled');
                document.getElementById('triple-counter').textContent = store.statements.length.toString();
            }
        });
    });
}

function exportStore(format) {
    let rdflibFormat = 'application/ld+json';
    let ext = 'json';
    switch (format) {
        case 'json-ld':
            rdflibFormat = 'application/ld+json';
            ext = 'json';
            break;
        case 'turtle':
            rdflibFormat = 'text/turtle';
            ext = 'ttl';
            break;
        case 'xml':
            rdflibFormat = 'application/rdf+xml';
            ext = 'xml';
            break;
    }
    const data = $rdf.serialize(undefined, store, undefined, rdflibFormat);
    const a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
    a.setAttribute('download', `openbismantic_export.${ext}`);
    a.click();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('export-button').setAttribute('disabled', 'true');
    document.getElementById('load-space-button').setAttribute('disabled', 'true');
    document.getElementById('search-form').onsubmit = ev => {
        const query = document.getElementById('search-input').value;
        fetchUrl(`https://xeo54:8128/openbismantic/search/?query=${encodeURIComponent(query)}`, false);
        ev.preventDefault();
    };
    document.getElementById('export-form').onsubmit = ev => {
        exportStore(document.getElementById('export-format-selection').value);
        ev.preventDefault();
    };
    document.getElementById('reset-button').onclick = () => {
        store = $rdf.graph();
        fetcher = new $rdf.Fetcher(store, timeout);
        resolvedIRIs = new Set();
        document.getElementById('triple-counter').textContent = 0;
        document.getElementById('export-button').setAttribute('disabled', 'true');
    };
    fetchUrl('https://xeo54:8128/openbismantic/instance/', false, true).then(() => {
        const query = 'SELECT ?s ?c WHERE {?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://purl.matolab.org/openbis/Space>; <https://purl.matolab.org/openbis/code> ?c.}.';
        internalStore.query($rdf.SPARQLToQuery(query, true, store), res => {
            const option = document.createElement('option');
            option.value = res['?s'].value.replace(/[<>]/g, '');
            option.textContent = res['?c'];
            document.getElementById('space-select').appendChild(option);
            document.getElementById('load-space-button').removeAttribute('disabled');
        });
    });
    document.getElementById('load-space-button').onclick = () => {
        fetchUrl(document.getElementById('space-select').value, true, false);
    };
});
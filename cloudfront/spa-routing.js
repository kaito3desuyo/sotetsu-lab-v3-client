// 拡張子の無い GET（画面の URL）を index.html に寄せる。Angular の画面遷移をブラウザに任せるため。
var indexPage = 'index.html';

function handler(event) {
    var request = event.request;
    var currentUri = request.uri;

    var doReplace = request.method === 'GET' && currentUri.indexOf('.') === -1;

    if (doReplace) {
        request.uri = '/' + indexPage;
    }

    return request;
}

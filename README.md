# koyoscore

![logo](https://github.com/YuseiNaito/koyoscore/blob/master/image/logo2_edit.png "logo")

## 1. サーバの起動、停止
 * [Node.js](https://nodejs.org/ja/)をインストール.
 * Node.js command promptでこのプロジェクトのディレクトリまで移動.
 *  `npm install socket.io`
   で[Socket.IO](https://socket.io)をインストール.
 * `node koyoscore.js`でサーバを起動.
 * **Ctrl**+**C**で停止. 
***
## 2. サービスへのアクセス
### 2-A. ローカルネットワーク内で起動しているサーバにアクセス
 * ローカルでサーバを起動した場合、サーバを起動しているPCからは http://localhost:3000 でアクセスできる.
 * 同一ネットワーク内の他の端末からは、http://**サーバを起動しているPCのIPv4アドレス**:3000でアクセスできる.
 * デフォルトではポートは3000に設定されているが、競合する場合は`koyoscore.js`から変更する.
### 2-B. インターネット上のサービスにアクセス
 * [koyoscore](https://koyoscore.glitch.me)に本サービスが公開されている.このリポジトリと接続されている.
   * 一定時間アクセスがなければサービスが落ちる模様.つまりそのタイミングでスコアはリセットされる.アクセスがあれば再開される.
   * スマートフォン等である程度の時間ブラウザから離れると(?)(スリープや別タスクなど)、スコアが更新されなくなることがある.このとき操作はスコアに反映されており、更新、Joinするとまた正しく表示される.

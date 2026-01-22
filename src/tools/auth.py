from requests_oauthlib import OAuth1Session
from bs4 import BeautifulSoup
import urllib.parse
import requests
import keys


# メールアドレスとパスワードの指定
user_id = keys.user_id
password = keys.password

# キーの設定
consumer_key = keys.consumer_key
consumer_secret = keys.consumer_secret


request_token_url = "https://api.zaim.net/v2/auth/request"
authorize_url = "https://auth.zaim.net/users/auth"
access_token_url = "https://api.zaim.net/v2/auth/access"
callback_url = "https://www.zaim.net/"

# リクエストトークンをもらってくる
zaim = OAuth1Session(
    consumer_key, client_secret=consumer_secret, callback_uri=callback_url)
get_oauth_token = zaim.fetch_request_token(request_token_url)
oauth_token = get_oauth_token['oauth_token']
oauth_token_secret = get_oauth_token['oauth_token_secret']
authorization_url = zaim.authorization_url(authorize_url)

# セッションを開始
session = requests.session()
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Safari/605.1.15',
    'Accept': '*/*'}

get = session.get(authorization_url, headers=headers)
soup = BeautifulSoup(get.text, "html.parser")


# ログイン
login_info = {
    '_method': 'POST',
    'data[_Token][key]': soup.find('input', {"name": "data[_Token][key]"}).get('value'),
    'oauth_token': oauth_token,
    'data[User][email]': user_id,
    'data[User][password]': password,
    'agree': 'ログインして許可する',
    'data[_Token][fields]': soup.find('input', {"name": "data[_Token][fields]"}).get('value'),
    'data[_Token][unlocked]': soup.find('input', {"name": "data[_Token][unlocked]"}).get('value'),
    'back': '/users/auth'
}

# oauth_verifierを取得する
res = session.post(authorize_url,
                   headers=headers, data=login_info)
res.raise_for_status()  # エラーならここで例外を発生させる
logind = BeautifulSoup(res.text, "html.parser")
resurl = logind.find('div', class_='callback').text


# access_tokenとsecretの取得
query = urllib.parse.urlparse(resurl).query
oauth_verifier = urllib.parse.parse_qs(query)['oauth_verifier'][0]
get_access_token = zaim.fetch_access_token(
    url=access_token_url, verifier=oauth_verifier)
access_token = get_access_token['oauth_token']
access_token_secret = get_access_token['oauth_token_secret']

# 結果の表示
print()
print('#これらをコピーしてkeys.pyに貼り付けてください')
print('access_token = \'{}\''.format(access_token))
print('access_token_secret = \'{}\''.format(access_token_secret))
print('oauth_verifier = \'{}\''.format(resurl))
print()

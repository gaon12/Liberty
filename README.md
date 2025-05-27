# Liberty MediaWiki Skin

[English](.github/README.en.md)

[리브레 위키](https://librewiki.net)의 기본 스킨입니다. 위키 엔진 '리버티'의 기본 레이아웃입니다. 미디어위키, XE의 스킨의 라이선스는 GPL3.0이며, 리버티 엔진의 라이선스는 MIT입니다.

## 개발
본 저장소는 리브레 위키의 [Liberty 스킨 저장소](https://github.com/librewiki/liberty-skin)를 포크하여 개발하고 있습니다. 따라서 버그 리포팅은 [bbs.librewiki.net](https://bbs.librewiki.net/)에서 해주시길 바랍니다. 보안 취약점은 이메일 (dev(골뱅이!)librewiki.net) 로 보고해 주세요.

본 저장소는 원본 저장소의 내용을 비정기적으로 가져와 개발하기 때문에, 최신 코드가 아닐 수 있습니다. 참고하시기 바랍니다.

본 저장소는 [가온 위키](https://www.gaonwiki.com)에서 사용할 목적으로 만든 개조판입니다. 물론 다른 위키에서도 사용하실 수 있습니다. 하드코딩된 부분이 있을 수 있기 때문에, 오류가 발생한다면 이슈 트래커로 알려주시거나, 하드코딩된 부분을 수정해 주시기 바랍니다.

## 원본과 다른 점
1. ~~얼만큼 스크롤이 되었는지 알려주는 인디케이터가 하단에 표시됩니다. [simple-scroll-progress](https://github.com/merlinwarage/simple-scroll-progress)(GPL 3)을 사용하였습니다. 이제 메인 색상(`$wgLibertyMainColor`)에 따라 인디케이터의 색상이 바뀝니다.~~

~~`simple-scroll-progress`의 js 파일은 로컬에서 불러오는 것이 아닌 [가온 공통 저장소](https://common.gaon.xyz)에서 불러옵니다.~~

별도의 확장기능으로 구현하여 제거합니다. 확장기능은 별도로 공개하도록 하겠습니다.

2. 개발자 도구에서 오류로 표시되던 share-api-polyfill.js.map 파일 404 오류를 해결했습니다.
3. 리버티 스킨에서 이젠 `$wgLogo`를 통해 로고를 설정할 수 있게 되었지만, 원래 로고 크기와 일치하지 않으면 이미지가 짤리는 문제가 있었습니다. 이를 해결했습니다.
4. 특히 모바일에서 가로로 긴 표가 짤리는데도 불구하고 스크롤이 되지 않는 문제를 해결했습니다.

## 원본 저장소
원본 저장소의 최신 코드를 가져오는데 덮어씌우면 기여자 목록이 반영되지 않기에, `Merge`로 가져올 예정입니다.

## 설치

* 미디어위키 Skins 폴더에 압축을 풀거나 git clone을 수행하세요. 압축해제된 폴더의 이름은 `Liberty` 이어야 합니다.
* LocalSettings.php 파일에 `wfLoadSkin( 'Liberty' );` 를 추가해 주세요.

## 설정

LocalSettings.php 파일에 아래와 같이 작성해주세요.

| 이름 | 설명 | 예시 값 | 기본 값 |
| ---- | ---- | ---- | ---- |
| `$wgLibertyMainColor` | `theme-color` 메타 설정 및 사이트 주 색상 설정 | `#4188F1` | `#4188F1` |
| `$wgLibertySecondColor` | 사이트 보조 색상 설정 | `#2774DC` | `$wgLibertyMainColor`의 값에서 `1A1415`만큼 뺀 값 |
| `$wgTwitterAccount` | 트위터 카드 계정 설정 | `librewiki` | (없음) |
| `$wgLibertyOgLogo` | 오픈그래프 태그에 사용 될 이미지 설정 | `https://librewiki.net/images/6/6a/Libre_favicon.png` | `$wgLogo`의 값 |
| `$wgNaverVerification` | 네이버 사이트 도구 인증 코드 | (네이버에서 제공된 값) | (없음) |
| `$wgLibertyAdSetting` | 구글 애드센스 설정 | `array( 'client' => '(Google Adsense에서 제공한 값)', 'header' => '1234567890', 'right' => '0987654321', 'belowarticle' => 1313135452 )` | (없음) |
| `$wgLibertyAdGroup` | 사용자 그룹별 광고 차등화 여부 설정 | `differ` | `null`|
| `$wgLibertyMobileReplaceAd` | 모바일 환경일 시 사이드바 광고를 하단으로 옮깁니다. | `true` | `false` |
| `$wgLibertyEnableLiveRC` | 사이드바 최근 변경 사용 여부 | `true` | `true` |
| `$wgLibertyMaxRecent` | 사이드바 최근 변경에 등장하는 편집의 최대 개수 | `10` | `10` |
| `$wgLibertyNavBarLogoImage` | 내비게이션 바에 표시되는 로고 이미지  | `./image.png` | `null` |
| `$wgLibertyLiveRCArticleNamespaces` | 사이드바 최근 변경 왼쪽 탭에 보여질 네임스페이스 목록 | `[NS_MAIN, NS_PROJECT, NS_TEMPLATE, NS_HELP, NS_CATEGORY]` | `[NS_MAIN, NS_PROJECT, NS_TEMPLATE, NS_HELP, NS_CATEGORY]` |
| `$wgLibertyLiveRCTalkNamespaces` | 사이드바 최근 변경 오른쪽 탭에 보여질 네임스페이스 목록 | `[NS_TALK, NS_USER_TALK, NS_PROJECT_TALK, NS_FILE_TALK, NS_MEDIAWIKI_TALK, NS_TEMPLATE_TALK, NS_HELP_TALK, NS_CATEGORY_TALK]` | `[NS_TALK, NS_USER_TALK, NS_PROJECT_TALK, NS_FILE_TALK, NS_MEDIAWIKI_TALK, NS_TEMPLATE_TALK, NS_HELP_TALK, NS_CATEGORY_TALK]` |

## 상단바

다음과 같은 형식을 따라서 `미디어위키:Liberty-Navbar` 문서에 작성해주세요.

* 최상단 메뉴:
  * `* icon=아이콘 | display=표시 내용 | title=Hover 문구 | link=클릭시 링크 | access=단축키 | class=커스텀 HTML 클래스 | group=필요 그룹 | right=필요 권한`
* 하위 메뉴:
  * `** icon=아이콘 | display=표시 내용 | title=Hover 문구 | link=클릭시 링크 | access=단축키 | class=커스텀 HTML 클래스 | group=필요 그룹 | right=필요 권한`
* 최하위 메뉴:
  * `*** icon=아이콘 | display=표시 내용 | title=Hover 문구 | link=클릭시 링크 | access=단축키 | class=커스텀 HTML 클래스 | group=필요 그룹 | right=필요 권한`

---

* 모든 내용은 선택이나, `icon`과 `display` 중 적어도 하나는 설정되어 있어야 합니다.
* 설정하지 않을 내용은 적지 않으면 됩니다. 예를 들어, 아이콘을 설정하지 않으려면 `icon=...`을 생략하면 됩니다.
* `title`이 설정되어 있지 않다면 `display`로 자동 설정 됩니다.
* `display`나 `title`을 설정할 때 미디어위키 i18n 메시지의 이름을 작성하여 해당 i18n 메시지의 내용이 출력되게 할 수 있습니다. (예시: `recentchanges`를 적으면 `최근 바뀜` 출력)
* 단축키는 `Alt-Shift-(키)`로 사용할 수 있습니다.
* 단축키를 설정할 때는 미디어위키에서 제공하는 기본 단축키와 겹치지 않도록 주의해 주세요.
* 커스텀 클래스는 `,`로 구분하여 작성해 주세요. (예시: `classA, classB`를 적어서 `classA`와 `classB` 클래스 추가)

예시는 [가온 위키](https://www.gaonwiki.com/w/MediaWiki:Liberty-Navbar)나 [리브레 위키](https://librewiki.net/wiki/MediaWiki:Liberty-Navbar)에서 확인할 수 있습니다.

## 권한

권한별 광고 차등화를 구현하기 위해 아래와 같이 네 가지 권한이 추가됩니다. 만약 $wgLibertyAdGroup이 'differ'로 설정되어 있다면 아래 권한에 따라 환경설정에 광고 커스터마이징 옵션이 나타납니다.

* blockads-header : 헤더 광고를 없앨 수 있습니다.
* blockads-right : 우측 광고를 없앨 수 있습니다.
* blockads-belowarticle : 글 하단 광고를 없앨 수 있습니다.
* blockads-bottom : 하단 광고를 없앨 수 있습니다.

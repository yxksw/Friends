export interface FriendLink {
    name: string;
    description: string;
    url: string;
    avatar: string;
    addDate?: string;
    recommended?: boolean;
    disconnected?: boolean;
}

export const FRIEND_LINKS: FriendLink[] = [
    {
        name: "ATao-Blog",
        description: "做自己喜欢的事",
        url: "https://blog.atao.cyou/",
        avatar: "https://cdn.atao.cyou/Web/Avatar.png",
        addDate: "2026-02-21",
    },
    {
        name: "梨尽兴",
        description: "A place for peace",
        url: "https://blog.ljx.icu",
        avatar: "https://blog.ljx.icu/favicon.png",
        addDate: "2026-02-20",
        recommended: true
    },
    {
        name: "纸鹿摸鱼处",
        description: "纸鹿至麓不知路，支炉制露不止漉",
        url: "https://blog.zhilu.site/",
        avatar: "https://www.zhilu.site/api/avatar.png",
        addDate: "2025-09-03",
        recommended: true
    },
    {
        name: "Luxynth",
        description: "我心匪石不可转",
        url: "https://www.luxynth.cn",
        avatar: "https://www.luxynth.cn/assets/images/avatar.jpg",
        addDate: "2025-09-09",
        disconnected: true
    },
    {
        name: "鈴奈咲桜のBlog",
        description: "愛することを忘れないで",
        url: "https://blog.sakura.ink",
        avatar: "https://q2.qlogo.cn/headimg_dl?dst_uin=2731443459&spec=5",
        addDate: "2025-09-09",
        recommended: true
    },
    // 在这里添加更多友链
];

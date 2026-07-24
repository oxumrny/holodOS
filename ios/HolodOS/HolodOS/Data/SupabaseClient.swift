import Foundation
import Supabase

enum AppConfig {
    static var supabaseURL: URL {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            !raw.isEmpty,
            !raw.contains("YOUR_"),
            let url = URL(string: raw)
        else {
            fatalError(
                """
                SUPABASE_URL не задан. Скопируйте Configs/Secrets.example.xcconfig \
                в Configs/Secrets.xcconfig и укажите URL проекта.
                """
            )
        }
        return url
    }

    static var supabaseAnonKey: String {
        guard
            let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
            !key.isEmpty,
            !key.contains("YOUR_")
        else {
            fatalError(
                """
                SUPABASE_ANON_KEY не задан. Скопируйте Configs/Secrets.example.xcconfig \
                в Configs/Secrets.xcconfig и укажите anon key.
                """
            )
        }
        return key
    }
}

enum SupabaseManager {
    static let client = SupabaseClient(
        supabaseURL: AppConfig.supabaseURL,
        supabaseKey: AppConfig.supabaseAnonKey
    )
}

/// DTO for Google OAuth HTTP POST payload
class GoogleAuthRequestDto {
  final String idToken;

  const GoogleAuthRequestDto({required this.idToken});

  Map<String, dynamic> toJson() => {'id_token': idToken};
}
